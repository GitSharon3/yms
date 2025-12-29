using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

using Yms.Infrastructure.Data;

#nullable disable

namespace Yms.Infrastructure.Migrations;

[DbContext(typeof(YmsDbContext))]
[Migration("20251229140000_AddAppointmentCodeAndHistory")]
public partial class AddAppointmentCodeAndHistory : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Appointments' AND column_name = 'Code'
    ) THEN
        ALTER TABLE ""Appointments"" ADD COLUMN ""Code"" character varying(20) NOT NULL DEFAULT '';
    END IF;
END $$;
");

        // Backfill codes for existing rows if needed.
        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Appointments' AND column_name = 'Code'
    ) THEN
        WITH numbered AS (
            SELECT ""Id"", row_number() OVER (ORDER BY ""CreatedAtUtc"") AS rn
            FROM ""Appointments""
            WHERE (""Code"" IS NULL OR ""Code"" = '')
        )
        UPDATE ""Appointments"" a
        SET ""Code"" = 'APT-' || lpad(numbered.rn::text, 4, '0')
        FROM numbered
        WHERE a.""Id"" = numbered.""Id"";
    END IF;
END $$;
");

        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = current_schema() AND indexname = 'IX_Appointments_Code'
    ) THEN
        CREATE UNIQUE INDEX ""IX_Appointments_Code"" ON ""Appointments"" (""Code"");
    END IF;
END $$;
");

        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'AppointmentHistoryItems'
    ) THEN
        CREATE TABLE ""AppointmentHistoryItems"" (
            ""Id"" uuid NOT NULL,
            ""AppointmentId"" uuid NOT NULL,
            ""Status"" int NOT NULL,
            ""AtUtc"" timestamp with time zone NOT NULL,
            ""Note"" character varying(1000) NULL,
            ""CreatedAtUtc"" timestamp with time zone NOT NULL,
            ""UpdatedAt"" timestamp with time zone NULL,
            CONSTRAINT ""PK_AppointmentHistoryItems"" PRIMARY KEY (""Id""),
            CONSTRAINT ""FK_AppointmentHistoryItems_Appointments_AppointmentId"" FOREIGN KEY (""AppointmentId"") REFERENCES ""Appointments""(""Id"") ON DELETE CASCADE
        );
    END IF;
END $$;
");

        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = current_schema() AND indexname = 'IX_AppointmentHistoryItems_AppointmentId'
    ) THEN
        CREATE INDEX ""IX_AppointmentHistoryItems_AppointmentId"" ON ""AppointmentHistoryItems"" (""AppointmentId"");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = current_schema() AND indexname = 'IX_AppointmentHistoryItems_AtUtc'
    ) THEN
        CREATE INDEX ""IX_AppointmentHistoryItems_AtUtc"" ON ""AppointmentHistoryItems"" (""AtUtc"");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = current_schema() AND indexname = 'IX_AppointmentHistoryItems_Status'
    ) THEN
        CREATE INDEX ""IX_AppointmentHistoryItems_Status"" ON ""AppointmentHistoryItems"" (""Status"");
    END IF;
END $$;
");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'AppointmentHistoryItems'
    ) THEN
        DROP TABLE ""AppointmentHistoryItems"";
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = current_schema() AND indexname = 'IX_Appointments_Code'
    ) THEN
        DROP INDEX ""IX_Appointments_Code"";
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Appointments' AND column_name = 'Code'
    ) THEN
        ALTER TABLE ""Appointments"" DROP COLUMN ""Code"";
    END IF;
END $$;
");
    }
}
