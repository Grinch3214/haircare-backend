CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"title" text,
	"description" text,
	"image_desktop_url" text NOT NULL,
	"image_mobile_url" text,
	"image_alt" text,
	"link_url" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sale_price_retail" numeric(10,2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sale_price_wholesale" numeric(10,2);