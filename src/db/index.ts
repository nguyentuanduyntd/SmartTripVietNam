import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import *as schema from "./schema/index";

const databaseUrl = process.env.DATABASE_URL;

if(!databaseUrl){
    throw new Error("Database_url is not defined");
}

const globalForDb = globalThis as unknown as{
    postgresClient?: ReturnType<typeof postgres>;
};

const postgresClient = globalForDb.postgresClient ?? postgres(databaseUrl,{
    prepare: false,
});

if(process.env.NODE_ENV !== "production"){
    globalForDb.postgresClient = postgresClient;
}

export const db = drizzle(postgresClient,{
    schema,
});
