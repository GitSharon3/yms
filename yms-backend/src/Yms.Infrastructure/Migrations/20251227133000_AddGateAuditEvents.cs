using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

using Yms.Infrastructure.Data;

#nullable disable

namespace Yms.Infrastructure.Migrations;

[DbContext(typeof(YmsDbContext))]
[Migration("20251227133000_AddGateAuditEvents")]
public partial class AddGateAuditEvents : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "GateAuditEvents",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Action = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                Outcome = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                ActorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                ActorRole = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                GateName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                VehicleId = table.Column<Guid>(type: "uuid", nullable: true),
                DriverId = table.Column<Guid>(type: "uuid", nullable: true),
                TrailerNumber = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                SealNumber = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                DockOrParking = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                DetailsJson = table.Column<string>(type: "text", nullable: true),
                OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_GateAuditEvents", x => x.Id);
                table.ForeignKey(
                    name: "FK_GateAuditEvents_Drivers_DriverId",
                    column: x => x.DriverId,
                    principalTable: "Drivers",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "FK_GateAuditEvents_Vehicles_VehicleId",
                    column: x => x.VehicleId,
                    principalTable: "Vehicles",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateIndex(name: "IX_GateAuditEvents_OccurredAtUtc", table: "GateAuditEvents", column: "OccurredAtUtc");
        migrationBuilder.CreateIndex(name: "IX_GateAuditEvents_Action", table: "GateAuditEvents", column: "Action");
        migrationBuilder.CreateIndex(name: "IX_GateAuditEvents_GateName", table: "GateAuditEvents", column: "GateName");
        migrationBuilder.CreateIndex(name: "IX_GateAuditEvents_VehicleId", table: "GateAuditEvents", column: "VehicleId");
        migrationBuilder.CreateIndex(name: "IX_GateAuditEvents_DriverId", table: "GateAuditEvents", column: "DriverId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "GateAuditEvents");
    }
}
