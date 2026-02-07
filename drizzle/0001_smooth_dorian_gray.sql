CREATE TABLE "trains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"train_no" varchar(6) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50),
	"zone" varchar(10),
	"source" varchar(5) NOT NULL,
	"destination" varchar(5) NOT NULL,
	"departure_time" time,
	"arrival_time" time,
	"duration_minutes" integer,
	"distance_km" integer,
	"classes" text,
	"return_train_no" varchar(6),
	"runs_on_days" varchar(7) NOT NULL,
	CONSTRAINT "trains_train_no_unique" UNIQUE("train_no")
);
