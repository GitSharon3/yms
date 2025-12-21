using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;

using Yms.Infrastructure.Data;

#nullable disable

namespace Yms.Infrastructure.Migrations;

[DbContext(typeof(YmsDbContext))]
[Migration("20251218170000_InitialYmsSchema")]
public partial class InitialYmsSchema : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Users",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                Username = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                PasswordHash = table.Column<byte[]>(type: "bytea", nullable: false),
                PasswordSalt = table.Column<byte[]>(type: "bytea", nullable: false),
                PasswordIterations = table.Column<int>(type: "integer", nullable: false),
                Role = table.Column<int>(type: "integer", nullable: false),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Users", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "Yards",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Yards", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "Drivers",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                FirstName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                LastName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                Phone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Drivers", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "Docks",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                YardId = table.Column<Guid>(type: "uuid", nullable: false),
                Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                Status = table.Column<int>(type: "integer", nullable: false),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Docks", x => x.Id);
                table.ForeignKey(
                    name: "FK_Docks_Yards_YardId",
                    column: x => x.YardId,
                    principalTable: "Yards",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "YardSections",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                YardId = table.Column<Guid>(type: "uuid", nullable: false),
                Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                Capacity = table.Column<int>(type: "integer", nullable: false),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_YardSections", x => x.Id);
                table.ForeignKey(
                    name: "FK_YardSections_Yards_YardId",
                    column: x => x.YardId,
                    principalTable: "Yards",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "Vehicles",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                VehicleNumber = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                Type = table.Column<int>(type: "integer", nullable: false),
                Status = table.Column<int>(type: "integer", nullable: false),
                YardSectionId = table.Column<Guid>(type: "uuid", nullable: true),
                DockId = table.Column<Guid>(type: "uuid", nullable: true),
                DriverId = table.Column<Guid>(type: "uuid", nullable: true),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Vehicles", x => x.Id);
                table.ForeignKey(
                    name: "FK_Vehicles_Docks_DockId",
                    column: x => x.DockId,
                    principalTable: "Docks",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "FK_Vehicles_Drivers_DriverId",
                    column: x => x.DriverId,
                    principalTable: "Drivers",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "FK_Vehicles_YardSections_YardSectionId",
                    column: x => x.YardSectionId,
                    principalTable: "YardSections",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateTable(
            name: "Appointments",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                YardId = table.Column<Guid>(type: "uuid", nullable: false),
                DockId = table.Column<Guid>(type: "uuid", nullable: true),
                VehicleId = table.Column<Guid>(type: "uuid", nullable: true),
                ScheduledStartUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                ScheduledEndUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                Status = table.Column<int>(type: "integer", nullable: false),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Appointments", x => x.Id);
                table.ForeignKey(
                    name: "FK_Appointments_Docks_DockId",
                    column: x => x.DockId,
                    principalTable: "Docks",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "FK_Appointments_Vehicles_VehicleId",
                    column: x => x.VehicleId,
                    principalTable: "Vehicles",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "FK_Appointments_Yards_YardId",
                    column: x => x.YardId,
                    principalTable: "Yards",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "GateActivities",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Type = table.Column<int>(type: "integer", nullable: false),
                GateName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                VehicleId = table.Column<Guid>(type: "uuid", nullable: true),
                DriverId = table.Column<Guid>(type: "uuid", nullable: true),
                OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_GateActivities", x => x.Id);
                table.ForeignKey(
                    name: "FK_GateActivities_Drivers_DriverId",
                    column: x => x.DriverId,
                    principalTable: "Drivers",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "FK_GateActivities_Vehicles_VehicleId",
                    column: x => x.VehicleId,
                    principalTable: "Vehicles",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateIndex(name: "IX_Users_Email", table: "Users", column: "Email", unique: true);
        migrationBuilder.CreateIndex(name: "IX_Users_Username", table: "Users", column: "Username", unique: true);

        migrationBuilder.CreateIndex(name: "IX_Drivers_Phone", table: "Drivers", column: "Phone");

        migrationBuilder.CreateIndex(name: "IX_Docks_Status", table: "Docks", column: "Status");
        migrationBuilder.CreateIndex(name: "IX_Docks_YardId_Name", table: "Docks", columns: new[] { "YardId", "Name" }, unique: true);
        migrationBuilder.CreateIndex(name: "IX_Docks_YardId", table: "Docks", column: "YardId");

        migrationBuilder.CreateIndex(name: "IX_YardSections_YardId_Name", table: "YardSections", columns: new[] { "YardId", "Name" }, unique: true);
        migrationBuilder.CreateIndex(name: "IX_YardSections_YardId", table: "YardSections", column: "YardId");

        migrationBuilder.CreateIndex(name: "IX_Vehicles_VehicleNumber", table: "Vehicles", column: "VehicleNumber", unique: true);
        migrationBuilder.CreateIndex(name: "IX_Vehicles_Status", table: "Vehicles", column: "Status");
        migrationBuilder.CreateIndex(name: "IX_Vehicles_YardSectionId", table: "Vehicles", column: "YardSectionId");
        migrationBuilder.CreateIndex(name: "IX_Vehicles_DockId", table: "Vehicles", column: "DockId");
        migrationBuilder.CreateIndex(name: "IX_Vehicles_DriverId", table: "Vehicles", column: "DriverId");

        migrationBuilder.CreateIndex(name: "IX_Appointments_ScheduledStartUtc", table: "Appointments", column: "ScheduledStartUtc");
        migrationBuilder.CreateIndex(name: "IX_Appointments_Status", table: "Appointments", column: "Status");
        migrationBuilder.CreateIndex(name: "IX_Appointments_YardId", table: "Appointments", column: "YardId");
        migrationBuilder.CreateIndex(name: "IX_Appointments_DockId", table: "Appointments", column: "DockId");
        migrationBuilder.CreateIndex(name: "IX_Appointments_VehicleId", table: "Appointments", column: "VehicleId");

        migrationBuilder.CreateIndex(name: "IX_GateActivities_OccurredAtUtc", table: "GateActivities", column: "OccurredAtUtc");
        migrationBuilder.CreateIndex(name: "IX_GateActivities_Type", table: "GateActivities", column: "Type");
        migrationBuilder.CreateIndex(name: "IX_GateActivities_VehicleId", table: "GateActivities", column: "VehicleId");
        migrationBuilder.CreateIndex(name: "IX_GateActivities_DriverId", table: "GateActivities", column: "DriverId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "GateActivities");
        migrationBuilder.DropTable(name: "Appointments");
        migrationBuilder.DropTable(name: "Users");
        migrationBuilder.DropTable(name: "Vehicles");
        migrationBuilder.DropTable(name: "Docks");
        migrationBuilder.DropTable(name: "Drivers");
        migrationBuilder.DropTable(name: "YardSections");
        migrationBuilder.DropTable(name: "Yards");
    }
}
