CREATE TYPE "public"."document_status" AS ENUM('active', 'superseded', 'revoked');--> statement-breakpoint
CREATE TABLE "document" (
	"id" text PRIMARY KEY NOT NULL,
	"analystId" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"number" text,
	"year" integer,
	"area" text NOT NULL,
	"status" "document_status" DEFAULT 'active' NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"fileHash" text NOT NULL,
	"storageUri" text NOT NULL,
	"pageCount" integer NOT NULL,
	"indexedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_analystId_fileHash_unique" UNIQUE("analystId","fileHash")
);
--> statement-breakpoint
CREATE TABLE "document_page" (
	"documentId" text NOT NULL,
	"page" integer NOT NULL,
	"text" text NOT NULL,
	"ocr" boolean DEFAULT false NOT NULL,
	CONSTRAINT "document_page_documentId_page_pk" PRIMARY KEY("documentId","page")
);
--> statement-breakpoint
CREATE TABLE "passage" (
	"id" text PRIMARY KEY NOT NULL,
	"documentId" text NOT NULL,
	"index" integer NOT NULL,
	"heading" text NOT NULL,
	"text" text NOT NULL,
	"pageStart" integer NOT NULL,
	"pageEnd" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_page" ADD CONSTRAINT "document_page_documentId_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passage" ADD CONSTRAINT "passage_documentId_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "passage_documentId_idx" ON "passage" USING btree ("documentId");