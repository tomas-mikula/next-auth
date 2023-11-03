import { runBasicTests } from "@auth/adapter-test"
import { AstraDBAdapter, format, defaultCollections } from "../src"
import type { AstraDBConfig } from "../src"

if (!process.env.ASTRA_DB_ID) throw new TypeError("ASTRA_DB_ID is missing")
if (!process.env.ASTRA_DB_REGION)
  throw new TypeError("ASTRA_DB_REGION is missing")
if (!process.env.ASTRA_DB_KEYSPACE)
  throw new TypeError("ASTRA_DB_KEYSPACE is missing")
if (!process.env.ASTRA_DB_APPLICATION_TOKEN)
  throw new TypeError("ASTRA_DB_APPLICATION_TOKEN is missing")

const api = {
  dbId: process.env.ASTRA_DB_ID,
  region: process.env.ASTRA_DB_REGION,
  keyspace: process.env.ASTRA_DB_KEYSPACE,
  token: process.env.ASTRA_DB_APPLICATION_TOKEN,
} satisfies AstraDBConfig["api"]

const baseUrl = `https://${api.dbId}-${api.region}.apps.astra.datastax.com/api/json/v1/${api.keyspace}`

const sessions = `${baseUrl}/${defaultCollections.sessions}`
const users = `${baseUrl}/${defaultCollections.users}`
const accounts = `${baseUrl}/${defaultCollections.accounts}`
const tokens = `${baseUrl}/${defaultCollections.tokens}`

function init(body: any) {
  return {
    method: "post",
    headers: {
      "x-cassandra-token": api.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  } satisfies RequestInit
}

runBasicTests({
  adapter: AstraDBAdapter({ api }),
  db: {
    async connect() {
      await Promise.all(
        Object.keys(defaultCollections).map((name) =>
          fetch(baseUrl, init({ createCollection: { name } }))
        )
      )
    },
    async disconnect() {
      await Promise.all(
        Object.keys(defaultCollections).map((name) =>
          fetch(baseUrl, init({ deleteCollection: { name } }))
        )
      )
    },
    session(sessionToken) {
      return format.from(
        fetch(sessions, init({ findOne: { filter: { sessionToken } } })).then(
          (res) => res.json()
        )
      )
    },
    user(_id: string) {
      return format.from(
        fetch(users, init({ findOne: { filter: { _id } } })).then((res) =>
          res.json()
        )
      )
    },
    account(filter) {
      return format.from(
        fetch(accounts, init({ findOne: { filter } })).then((res) => res.json())
      )
    },
    verificationToken(filter) {
      return format.from(
        fetch(tokens, init({ findOne: { filter } })).then((res) => res.json())
      )
    },
  },
})
