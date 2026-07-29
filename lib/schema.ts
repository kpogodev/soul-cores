import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  boolean,
  timestamp,
  numeric,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// ─────────────────────────────────────────────────────────────
// Drużyny
// ─────────────────────────────────────────────────────────────

export const teams = pgTable("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  organizerId: text("organizer_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Faktyczni członkowie drużyny (user może należeć do wielu drużyn)
export const teamMembers = pgTable(
  "team_members",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["organizer", "member"] })
      .notNull()
      .default("member"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.teamId, table.userId] })]
);

// Prośby o dołączenie do drużyny z listy — organizator akceptuje/odrzuca
export const teamJoinRequests = pgTable(
  "team_join_requests",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["pending", "accepted", "rejected"] })
      .notNull()
      .default("pending"),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.teamId, table.userId)]
);

// ─────────────────────────────────────────────────────────────
// Soul Cores — dane statyczne (seed ze zescrapowanego JSON-a)
// ─────────────────────────────────────────────────────────────

export const soulCores = pgTable("soul_cores", {
  id: text("id").primaryKey(), // slug, np. "orc_warlord"
  creature: text("creature").notNull(),
  name: text("name").notNull(), // np. "Orc Warlord Soul Core"
  img: text("img").notNull(), // nazwa pliku w public/soul-cores/images
});

// ─────────────────────────────────────────────────────────────
// Pula drużyny — konkretny dostarczony egzemplarz soul core'a
// (to samo stworzenie może mieć wiele wpisów w czasie, bo item
// się zużywa przy wejściu do Soulpit)
// ─────────────────────────────────────────────────────────────

export const teamSoulCores = pgTable("team_soul_cores", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  soulCoreId: text("soul_core_id")
    .notNull()
    .references(() => soulCores.id, { onDelete: "cascade" }),
  suppliedBy: text("supplied_by")
    .notNull()
    .references(() => user.id),
  price: numeric("price", { precision: 12, scale: 2 }),
  // pending = zaproponowane przez członka, czeka na akceptację organizatora
  // accepted = organizator zaakceptował -> powstały statusy uczestników
  // rejected = organizator odrzucił
  status: text("status", { enum: ["pending", "accepted", "rejected"] })
    .notNull()
    .default("pending"),
  // ustawione przez organizatora gdy run się odbył - zamraża rozliczenie
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Per-uczestnik status dla danego wpisu w puli. Uczestnikiem może być
// zarówno formalny członek drużyny, jak i osoba z zewnątrz dodana
// tylko do tego konkretnego wpisu (dlatego referencja idzie do `user`,
// a nie przez `team_members`).
export const teamSoulCoreStatus = pgTable(
  "team_soul_core_status",
  {
    teamSoulCoreId: text("team_soul_core_id")
      .notNull()
      .references(() => teamSoulCores.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at"),
    // kwota zapłacona przez tę osobę, zamrożona w momencie zamknięcia wpisu
    // (null = nie płacił - dostawca albo już miał zrobione przed zamknięciem)
    paidShare: numeric("paid_share", { precision: 12, scale: 2 }),
    // czy dostawca odhaczył że faktycznie dostał tę kwotę
    paid: boolean("paid").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.teamSoulCoreId, table.userId] })]
);

// ─────────────────────────────────────────────────────────────
// Relacje
// ─────────────────────────────────────────────────────────────

export const teamsRelations = relations(teams, ({ one, many }) => ({
  organizer: one(user, {
    fields: [teams.organizerId],
    references: [user.id],
  }),
  members: many(teamMembers),
  joinRequests: many(teamJoinRequests),
  soulCorePool: many(teamSoulCores),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(user, {
    fields: [teamMembers.userId],
    references: [user.id],
  }),
}));

export const teamJoinRequestsRelations = relations(
  teamJoinRequests,
  ({ one }) => ({
    team: one(teams, {
      fields: [teamJoinRequests.teamId],
      references: [teams.id],
    }),
    user: one(user, {
      fields: [teamJoinRequests.userId],
      references: [user.id],
    }),
  })
);

export const soulCoresRelations = relations(soulCores, ({ many }) => ({
  teamEntries: many(teamSoulCores),
}));

export const teamSoulCoresRelations = relations(
  teamSoulCores,
  ({ one, many }) => ({
    team: one(teams, {
      fields: [teamSoulCores.teamId],
      references: [teams.id],
    }),
    soulCore: one(soulCores, {
      fields: [teamSoulCores.soulCoreId],
      references: [soulCores.id],
    }),
    supplier: one(user, {
      fields: [teamSoulCores.suppliedBy],
      references: [user.id],
    }),
    participantStatuses: many(teamSoulCoreStatus),
  })
);

export const teamSoulCoreStatusRelations = relations(
  teamSoulCoreStatus,
  ({ one }) => ({
    entry: one(teamSoulCores, {
      fields: [teamSoulCoreStatus.teamSoulCoreId],
      references: [teamSoulCores.id],
    }),
    user: one(user, {
      fields: [teamSoulCoreStatus.userId],
      references: [user.id],
    }),
  })
);