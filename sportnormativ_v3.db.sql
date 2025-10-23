BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "add_requirements" (
	"id"	INTEGER,
	"condition_id"	INTEGER NOT NULL,
	"addition_type"	TEXT NOT NULL,
	"addition"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "conditions" (
	"id"	INTEGER,
	"normative_id"	INTEGER NOT NULL,
	"requirement_id"	INTEGER NOT NULL,
	"condition"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("normative_id") REFERENCES "normatives"("id"),
	FOREIGN KEY("requirement_id") REFERENCES "ref_requirements"("id")
);
CREATE TABLE IF NOT EXISTS "groups" (
	"discipline_parameter_id"	INTEGER NOT NULL,
	"normative_id"	INTEGER NOT NULL,
	FOREIGN KEY("discipline_parameter_id") REFERENCES "lnk_discipline_parameters"("id"),
	FOREIGN KEY("normative_id") REFERENCES "normatives"("id")
);
CREATE TABLE IF NOT EXISTS "lnk_discipline_parameters" (
	"id"	INTEGER,
	"discipline_id"	INTEGER NOT NULL,
	"parameter_id"	INTEGER NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("discipline_id") REFERENCES "ref_disciplines"("id"),
	FOREIGN KEY("parameter_id") REFERENCES "ref_parameters"("id")
);
CREATE TABLE IF NOT EXISTS "normatives" (
	"id"	INTEGER,
	"rank_id"	INTEGER NOT NULL,
	"sorting"	INTEGER,
	"remark"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("rank_id") REFERENCES "ref_ranks"("id")
);
CREATE TABLE IF NOT EXISTS "ref_disciplines" (
	"id"	INTEGER,
	"sport_id"	INTEGER NOT NULL,
	"discipline_name"	TEXT NOT NULL UNIQUE,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("sport_id") REFERENCES "ref_sports"("id")
);
CREATE TABLE IF NOT EXISTS "ref_parameter_types" (
	"id"	INTEGER,
	"short_name"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "ref_parameters" (
	"id"	INTEGER,
	"parameter_type_id"	INTEGER NOT NULL,
	"parameter_value"	INTEGER,
	"remark"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("parameter_type_id") REFERENCES "ref_parameter_types"("id")
);
CREATE TABLE IF NOT EXISTS "ref_ranks" (
	"id"	INTEGER,
	"short_name"	TEXT NOT NULL,
	"full_name"	TEXT,
	"prestige"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "ref_requirement_types" (
	"id"	INTEGER,
	"type_name"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "ref_requirements" (
	"id"	INTEGER,
	"requirement_type_id"	INTEGER NOT NULL,
	"requirement_value"	INTEGER,
	"description"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("requirement_type_id") REFERENCES "ref_requirement_types"("id")
);
CREATE TABLE IF NOT EXISTS "ref_sport_types" (
	"id"	INTEGER,
	"type_name"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "ref_sports" (
	"id"	INTEGER,
	"sport_name"	TEXT NOT NULL,
	"minsport_act_id"	INTEGER,
	"sport_type_id"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("minsport_act_id") REFERENCES "sport_ministry_acts"("id"),
	FOREIGN KEY("sport_type_id") REFERENCES "ref_sport_types"("id")
);
CREATE TABLE IF NOT EXISTS "sport_ministry_acts" (
	"id"	INTEGER,
	"act_name"	TEXT NOT NULL,
	"start_date"	DATE,
	"end_date"	DATE,
	"act_details"	TEXT,
	"remark"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
INSERT INTO "conditions" VALUES (1,1,1,'4,8');
INSERT INTO "conditions" VALUES (2,2,1,'4,5');
INSERT INTO "conditions" VALUES (3,3,1,'4,2');
INSERT INTO "conditions" VALUES (4,4,1,'7,9');
INSERT INTO "conditions" VALUES (5,5,1,'7,3');
INSERT INTO "conditions" VALUES (6,6,1,'6,8');
INSERT INTO "groups" VALUES (1,1);
INSERT INTO "groups" VALUES (8,1);
INSERT INTO "groups" VALUES (1,2);
INSERT INTO "groups" VALUES (8,2);
INSERT INTO "groups" VALUES (1,3);
INSERT INTO "groups" VALUES (8,3);
INSERT INTO "groups" VALUES (2,4);
INSERT INTO "groups" VALUES (8,4);
INSERT INTO "groups" VALUES (2,5);
INSERT INTO "groups" VALUES (8,5);
INSERT INTO "groups" VALUES (2,6);
INSERT INTO "groups" VALUES (8,6);
INSERT INTO "lnk_discipline_parameters" VALUES (1,1,1);
INSERT INTO "lnk_discipline_parameters" VALUES (2,1,2);
INSERT INTO "lnk_discipline_parameters" VALUES (3,1,3);
INSERT INTO "lnk_discipline_parameters" VALUES (4,1,4);
INSERT INTO "lnk_discipline_parameters" VALUES (5,1,5);
INSERT INTO "lnk_discipline_parameters" VALUES (6,1,6);
INSERT INTO "lnk_discipline_parameters" VALUES (7,1,7);
INSERT INTO "lnk_discipline_parameters" VALUES (8,1,8);
INSERT INTO "lnk_discipline_parameters" VALUES (9,1,9);
INSERT INTO "lnk_discipline_parameters" VALUES (10,1,10);
INSERT INTO "normatives" VALUES (1,1,NULL,'');
INSERT INTO "normatives" VALUES (2,2,NULL,'');
INSERT INTO "normatives" VALUES (3,3,NULL,'');
INSERT INTO "normatives" VALUES (4,1,NULL,'');
INSERT INTO "normatives" VALUES (5,2,NULL,'');
INSERT INTO "normatives" VALUES (6,3,NULL,'');
INSERT INTO "normatives" VALUES (7,1,NULL,'');
INSERT INTO "normatives" VALUES (8,2,NULL,'');
INSERT INTO "normatives" VALUES (9,3,NULL,'');
INSERT INTO "normatives" VALUES (10,4,NULL,'');
INSERT INTO "normatives" VALUES (11,5,NULL,'');
INSERT INTO "normatives" VALUES (12,6,NULL,'');
INSERT INTO "normatives" VALUES (13,7,NULL,'');
INSERT INTO "ref_disciplines" VALUES (1,1,'Бег');
INSERT INTO "ref_disciplines" VALUES (2,1,'Бег по шоссе');
INSERT INTO "ref_disciplines" VALUES (3,1,'Эстафета');
INSERT INTO "ref_disciplines" VALUES (4,1,'Бег с барьерами');
INSERT INTO "ref_disciplines" VALUES (5,1,'Бег с препятствиями');
INSERT INTO "ref_disciplines" VALUES (6,1,'Кросс');
INSERT INTO "ref_disciplines" VALUES (7,1,'Ходьба');
INSERT INTO "ref_disciplines" VALUES (8,1,'Прыжок в высоту');
INSERT INTO "ref_disciplines" VALUES (9,1,'Прыжок в длину');
INSERT INTO "ref_disciplines" VALUES (10,1,'Прыжок с шестом');
INSERT INTO "ref_disciplines" VALUES (11,1,'Прыжок тройной');
INSERT INTO "ref_disciplines" VALUES (12,1,'Метание диска');
INSERT INTO "ref_disciplines" VALUES (13,1,'Метание копья');
INSERT INTO "ref_disciplines" VALUES (14,1,'Метание гранаты');
INSERT INTO "ref_disciplines" VALUES (15,1,'Метание мяча');
INSERT INTO "ref_disciplines" VALUES (16,1,'Толкание ядра');
INSERT INTO "ref_disciplines" VALUES (17,1,'10-борье');
INSERT INTO "ref_disciplines" VALUES (18,1,'7-борье');
INSERT INTO "ref_disciplines" VALUES (19,1,'5-борье');
INSERT INTO "ref_disciplines" VALUES (20,1,'4-борье');
INSERT INTO "ref_disciplines" VALUES (21,1,'3-борье');
INSERT INTO "ref_parameter_types" VALUES (1,'Длина круга');
INSERT INTO "ref_parameter_types" VALUES (2,'Хронометраж');
INSERT INTO "ref_parameter_types" VALUES (3,'Возраст');
INSERT INTO "ref_parameter_types" VALUES (4,'Хронометраж');
INSERT INTO "ref_parameter_types" VALUES (5,'Дистанция');
INSERT INTO "ref_parameter_types" VALUES (6,'Высота барьера');
INSERT INTO "ref_parameter_types" VALUES (7,'Пол');
INSERT INTO "ref_parameter_types" VALUES (8,'Пол, возраст');
INSERT INTO "ref_parameters" VALUES (1,5,'30 м','');
INSERT INTO "ref_parameters" VALUES (2,5,'50 м','');
INSERT INTO "ref_parameters" VALUES (3,5,'60 м','');
INSERT INTO "ref_parameters" VALUES (4,5,'100 м','');
INSERT INTO "ref_parameters" VALUES (5,5,'200 м','');
INSERT INTO "ref_parameters" VALUES (6,5,'300 м','');
INSERT INTO "ref_parameters" VALUES (7,5,'400 м','');
INSERT INTO "ref_parameters" VALUES (8,4,'Ручной хронометраж','');
INSERT INTO "ref_parameters" VALUES (9,4,'Автохронометраж','');
INSERT INTO "ref_parameters" VALUES (10,1,'Круг 400 м','');
INSERT INTO "ref_ranks" VALUES (1,'3 юн.','3-ий юношеский разряд',10);
INSERT INTO "ref_ranks" VALUES (2,'2 юн.','2-ой юношеский разряд',20);
INSERT INTO "ref_ranks" VALUES (3,'1 юн.','1-ый юношеский разряд',30);
INSERT INTO "ref_ranks" VALUES (4,'3 взр.','3-ий взрослый разряд',40);
INSERT INTO "ref_ranks" VALUES (5,'2 взр.','2-ой взрослый разряд',50);
INSERT INTO "ref_ranks" VALUES (6,'1 взр.','1-ый взрослый разряд',60);
INSERT INTO "ref_ranks" VALUES (7,'КМС','Кандидат в мастера спорта',70);
INSERT INTO "ref_ranks" VALUES (8,'МС','Мастер спорта',80);
INSERT INTO "ref_ranks" VALUES (9,'МСМК','Мастер спорта международного класса',90);
INSERT INTO "ref_ranks" VALUES (10,'ЗМС','Заслуженный мастер спорта',100);
INSERT INTO "ref_ranks" VALUES (11,'ПМС','Почетный мастер спорта',1);
INSERT INTO "ref_requirement_types" VALUES (1,'Единица измерения');
INSERT INTO "ref_requirement_types" VALUES (2,'Статус спортивного соревнования');
INSERT INTO "ref_requirements" VALUES (1,1,'с','секунда');
INSERT INTO "ref_requirements" VALUES (2,1,'мин','минута');
INSERT INTO "ref_requirements" VALUES (3,1,'ч','час');
INSERT INTO "ref_requirements" VALUES (4,1,'м','метр');
INSERT INTO "ref_requirements" VALUES (5,1,'км','километр');
INSERT INTO "ref_requirements" VALUES (6,1,'кг','килограмм');
INSERT INTO "ref_requirements" VALUES (7,1,'очки','кол-во очков');
INSERT INTO "ref_requirements" VALUES (8,1,'штраф','кол-во штрафных очков');
INSERT INTO "ref_requirements" VALUES (9,2,'Чемпионат Европы','');
INSERT INTO "ref_requirements" VALUES (10,2,'Первенство России',NULL);
INSERT INTO "ref_sports" VALUES (1,'Лёгкая атлетика',1,NULL);
INSERT INTO "ref_sports" VALUES (2,'Волейбол',1,NULL);
INSERT INTO "sport_ministry_acts" VALUES (1,'Приложение №16 к приказу Минспорта России от «_20_»__декабря__','26.11.2024',NULL,'С изменениями, внесенными приказами Минспорта России от 10.04.23. № 244 и от 06.11.24. № 1092','Лёгкая атлетика');
CREATE UNIQUE INDEX IF NOT EXISTS "idx_group_unique" ON "groups" (
	"discipline_parameter_id",
	"normative_id"
);
COMMIT;
