import fs from "fs";
import path from "path";
import { Collection, Db, MongoClient } from "mongodb";
import { ContactMessage, ExperienceEntry, ProfileAssets, Project } from "../types";
import { experience as seedExperience, projects as seedProjects } from "./seed";

interface LegacyData {
  projects: Project[];
  experience: ExperienceEntry[];
  profileAssets?: ProfileAssets;
}

type MongoRecord<T extends { id: string }> = T & { _id: string };
type ProfileAssetsRecord = ProfileAssets & { _id: "profileAssets" };

const legacyFile = path.join(process.cwd(), "data", "db.json");
let database: Db | undefined;
let mongoClient: MongoClient | undefined;

function getDatabase(): Db {
  if (!database) throw new Error("MongoDB store is not connected.");
  return database;
}

function getProjectsCollection(): Collection<MongoRecord<Project>> {
  return getDatabase().collection<MongoRecord<Project>>("projects");
}

function getExperienceCollection(): Collection<MongoRecord<ExperienceEntry>> {
  return getDatabase().collection<MongoRecord<ExperienceEntry>>("experience");
}

function getProfileAssetsCollection(): Collection<ProfileAssetsRecord> {
  return getDatabase().collection<ProfileAssetsRecord>("settings");
}

function getContactsCollection(): Collection<MongoRecord<ContactMessage>> {
  return getDatabase().collection<MongoRecord<ContactMessage>>("contacts");
}

function readLegacyData(): LegacyData {
  if (fs.existsSync(legacyFile)) {
    return JSON.parse(fs.readFileSync(legacyFile, "utf-8")) as LegacyData;
  }
  return { projects: seedProjects, experience: seedExperience };
}

function withoutMongoId<T extends { _id: string }>(record: T): Omit<T, "_id"> {
  const { _id, ...document } = record;
  return document;
}

async function migrateLegacyData(): Promise<void> {
  const legacy = readLegacyData();
  const projects = getProjectsCollection();
  const experience = getExperienceCollection();

  if ((await projects.countDocuments()) === 0 && legacy.projects.length > 0) {
    await projects.insertMany(legacy.projects.map((project) => ({ ...project, _id: project.id })));
  }

  if ((await experience.countDocuments()) === 0 && legacy.experience.length > 0) {
    await experience.insertMany(legacy.experience.map((entry) => ({ ...entry, _id: entry.id })));
  }

  const profileAssets = getProfileAssetsCollection();
  if (legacy.profileAssets && (await profileAssets.countDocuments()) === 0) {
    await profileAssets.insertOne({ ...legacy.profileAssets, _id: "profileAssets" });
  }
}

export async function connectStore(): Promise<void> {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/portfolio";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    mongoClient = client;
    database = process.env.MONGODB_DB ? client.db(process.env.MONGODB_DB) : client.db();
    await migrateLegacyData();
    console.log(`Connected to MongoDB database: ${database.databaseName}`);
  } catch (error) {
    await client.close();
    database = undefined;
    mongoClient = undefined;
    throw error;
  }
}

export async function closeStore(): Promise<void> {
  await mongoClient?.close();
  database = undefined;
  mongoClient = undefined;
}

export async function getProjects(): Promise<Project[]> {
  const records = await getProjectsCollection().find().toArray();
  return records.map((record) => withoutMongoId(record));
}

export async function addProject(input: Omit<Project, "id">): Promise<Project> {
  const project: Project = { id: makeId("project"), ...input };
  await getProjectsCollection().insertOne({ ...project, _id: project.id });
  return project;
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, "id">>
): Promise<Project | null> {
  const collection = getProjectsCollection();
  const result = await collection.updateOne({ _id: id }, { $set: updates });
  if (!result.matchedCount) return null;
  const updated = await collection.findOne({ _id: id });
  return updated ? withoutMongoId(updated) : null;
}

export async function deleteProject(id: string): Promise<boolean> {
  const result = await getProjectsCollection().deleteOne({ _id: id });
  return result.deletedCount > 0;
}

export async function getContacts(): Promise<ContactMessage[]> {
  const records = await getContactsCollection().find().sort({ receivedAt: -1 }).toArray();
  return records.map((record) => withoutMongoId(record));
}

export async function addContact(
  input: Omit<ContactMessage, "id" | "receivedAt" | "isRead" | "handled">
): Promise<ContactMessage> {
  const contact: ContactMessage = {
    id: makeId("contact"),
    ...input,
    receivedAt: new Date().toISOString(),
    isRead: false,
    handled: false,
  };
  await getContactsCollection().insertOne({ ...contact, _id: contact.id });
  return contact;
}

export async function updateContact(
  id: string,
  updates: Partial<Pick<ContactMessage, "isRead" | "handled">>
): Promise<ContactMessage | null> {
  const collection = getContactsCollection();
  const result = await collection.updateOne({ _id: id }, { $set: updates });
  if (!result.matchedCount) return null;
  const updated = await collection.findOne({ _id: id });
  return updated ? withoutMongoId(updated) : null;
}

export async function deleteContact(id: string): Promise<boolean> {
  const result = await getContactsCollection().deleteOne({ _id: id });
  return result.deletedCount > 0;
}

export async function getExperience(): Promise<ExperienceEntry[]> {
  const records = await getExperienceCollection().find().toArray();
  return records.map((record) => withoutMongoId(record));
}

export async function getProfileAssets(): Promise<ProfileAssets> {
  const record = await getProfileAssetsCollection().findOne({ _id: "profileAssets" });
  return record ? withoutMongoId(record) : {};
}

export async function setProfileAsset(asset: keyof ProfileAssets, url: string): Promise<void> {
  const update = asset === "photoUrl" ? { photoUrl: url } : { resumeUrl: url };
  await getProfileAssetsCollection().updateOne(
    { _id: "profileAssets" },
    { $set: update },
    { upsert: true }
  );
}

export async function addExperience(
  input: Omit<ExperienceEntry, "id">
): Promise<ExperienceEntry> {
  const entry: ExperienceEntry = { id: makeId("exp"), ...input };
  await getExperienceCollection().insertOne({ ...entry, _id: entry.id });
  return entry;
}

export async function updateExperience(
  id: string,
  updates: Partial<Omit<ExperienceEntry, "id">>
): Promise<ExperienceEntry | null> {
  const collection = getExperienceCollection();
  const result = await collection.updateOne({ _id: id }, { $set: updates });
  if (!result.matchedCount) return null;
  const updated = await collection.findOne({ _id: id });
  return updated ? withoutMongoId(updated) : null;
}

export async function deleteExperience(id: string): Promise<boolean> {
  const result = await getExperienceCollection().deleteOne({ _id: id });
  return result.deletedCount > 0;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
