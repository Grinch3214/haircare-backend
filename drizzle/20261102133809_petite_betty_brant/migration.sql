ALTER TABLE "promotions" ADD COLUMN "store_id" uuid;--> statement-breakpoint
CREATE INDEX "promotions_store_id_idx" ON "promotions" ("store_id");--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_store_id_stores_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE;