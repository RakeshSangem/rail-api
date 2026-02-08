CREATE TABLE "train_fares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"train_no" varchar(6) NOT NULL,
	"class" varchar(5) NOT NULL,
	"quota" varchar(5) NOT NULL,
	"fare" integer NOT NULL,
	"currency" varchar(5) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "train_coaches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"train_no" varchar(6) NOT NULL,
	"coach_code" varchar(10) NOT NULL,
	"coach_class" varchar(10) NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "train_routes" DROP CONSTRAINT "train_routes_station_code_stations_code_fk";
--> statement-breakpoint
ALTER TABLE "train_routes" ADD COLUMN "code" varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE "train_routes" ADD COLUMN "station" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "train_routes" ADD COLUMN "arr" varchar(10);--> statement-breakpoint
ALTER TABLE "train_routes" ADD COLUMN "dep" varchar(10);--> statement-breakpoint
ALTER TABLE "train_routes" ADD COLUMN "dist" integer;--> statement-breakpoint
ALTER TABLE "train_fares" ADD CONSTRAINT "train_fares_train_no_trains_train_no_fk" FOREIGN KEY ("train_no") REFERENCES "public"."trains"("train_no") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "train_coaches" ADD CONSTRAINT "train_coaches_train_no_trains_train_no_fk" FOREIGN KEY ("train_no") REFERENCES "public"."trains"("train_no") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "train_fares_train_no_class_quota" ON "train_fares" USING btree ("train_no","class","quota");--> statement-breakpoint
CREATE UNIQUE INDEX "train_coaches_train_no_coach_code" ON "train_coaches" USING btree ("train_no","coach_code");--> statement-breakpoint
ALTER TABLE "train_routes" ADD CONSTRAINT "train_routes_code_stations_code_fk" FOREIGN KEY ("code") REFERENCES "public"."stations"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "train_routes_train_no_seq_code" ON "train_routes" USING btree ("train_no","seq","code");--> statement-breakpoint
ALTER TABLE "train_routes" DROP COLUMN "station_code";--> statement-breakpoint
ALTER TABLE "train_routes" DROP COLUMN "arrival";--> statement-breakpoint
ALTER TABLE "train_routes" DROP COLUMN "departure";--> statement-breakpoint
ALTER TABLE "train_routes" DROP COLUMN "distance_km";