import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    // Fase 1: sem confirmação de e-mail (ver docs/pesquisa-referencias.md, seção E)
    requireEmailVerification: false,
    minPasswordLength: 8,
    autoSignIn: true,
  },

  user: {
    additionalFields: {
      telefone: { type: "string", required: false, input: true },
      // input: false → o cadastro público NUNCA consegue escolher o papel.
      papel: {
        type: ["cliente", "profissional", "dona"],
        required: false,
        defaultValue: "cliente",
        input: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 dias
    updateAge: 60 * 60 * 24, // renova uma vez por dia
  },

  // Deve ser o último plugin: grava cookies quando chamado em Server Actions.
  plugins: [nextCookies()],
});

export type Sessao = typeof auth.$Infer.Session;
export type Papel = "cliente" | "profissional" | "dona";
