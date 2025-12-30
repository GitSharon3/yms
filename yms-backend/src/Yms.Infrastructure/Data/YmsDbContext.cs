using Microsoft.EntityFrameworkCore;

using Yms.Core.Entities;

namespace Yms.Infrastructure.Data;

public sealed class YmsDbContext : DbContext
{
    public YmsDbContext(DbContextOptions<YmsDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Yard> Yards => Set<Yard>();
    public DbSet<YardSection> YardSections => Set<YardSection>();
    public DbSet<Dock> Docks => Set<Dock>();
    public DbSet<Driver> Drivers => Set<Driver>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<VehicleAssignment> VehicleAssignments => Set<VehicleAssignment>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<AppointmentHistoryItem> AppointmentHistoryItems => Set<AppointmentHistoryItem>();
    public DbSet<GateActivity> GateActivities => Set<GateActivity>();
    public DbSet<GateAuditEvent> GateAuditEvents => Set<GateAuditEvent>();
    public DbSet<VehicleAuditLog> VehicleAuditLogs => Set<VehicleAuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.FullName).IsRequired().HasMaxLength(100);
            entity.Property(x => x.Email).IsRequired().HasMaxLength(254);
            entity.Property(x => x.Phone).IsRequired().HasMaxLength(20);
            entity.Property(x => x.Username).IsRequired().HasMaxLength(50);
            entity.Property(x => x.Role).IsRequired().HasMaxLength(50);
            entity.Property(x => x.PasswordHash).IsRequired();
            entity.Property(x => x.PasswordSalt).IsRequired();
            entity.Property(x => x.PasswordIterations).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.UpdatedAt);

            entity.HasIndex(x => x.Email).IsUnique();
            entity.HasIndex(x => x.Username).IsUnique();
        });

        modelBuilder.Entity<Yard>(entity =>
        {
            entity.ToTable("Yards");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name).IsRequired().HasMaxLength(200);
            entity.Property(x => x.Address).HasMaxLength(500);
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity.HasMany(x => x.Sections)
                .WithOne(x => x.Yard)
                .HasForeignKey(x => x.YardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(x => x.Docks)
                .WithOne(x => x.Yard)
                .HasForeignKey(x => x.YardId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<YardSection>(entity =>
        {
            entity.ToTable("YardSections");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name).IsRequired().HasMaxLength(100);
            entity.Property(x => x.Capacity).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity.HasIndex(x => new { x.YardId, x.Name }).IsUnique();
        });

        modelBuilder.Entity<Dock>(entity =>
        {
            entity.ToTable("Docks");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name).IsRequired().HasMaxLength(100);
            entity.Property(x => x.Status).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity.HasIndex(x => new { x.YardId, x.Name }).IsUnique();
            entity.HasIndex(x => x.Status);
        });

        modelBuilder.Entity<Driver>(entity =>
        {
            entity.ToTable("Drivers");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.UserId);
            entity.Property(x => x.FirstName).IsRequired().HasMaxLength(80);
            entity.Property(x => x.LastName).IsRequired().HasMaxLength(80);
            entity.Property(x => x.Phone).HasMaxLength(30);
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity.HasIndex(x => x.Phone);
            entity.HasIndex(x => x.UserId).IsUnique();

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.ToTable("Vehicles");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.VehicleNumber).IsRequired().HasMaxLength(40);
            entity.Property(x => x.LicensePlate).HasMaxLength(30);
            entity.Property(x => x.TrailerNumber).HasMaxLength(60);
            entity.Property(x => x.Type).IsRequired();
            entity.Property(x => x.Status).IsRequired();
            entity.Property(x => x.IsOnHold).IsRequired();
            entity.Property(x => x.HoldReason).HasMaxLength(250);
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity.HasIndex(x => x.VehicleNumber).IsUnique();
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.YardSectionId);
            entity.HasIndex(x => x.DockId);
            entity.HasIndex(x => x.DriverId);

            entity.HasOne(x => x.YardSection)
                .WithMany(x => x.Vehicles)
                .HasForeignKey(x => x.YardSectionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(x => x.Dock)
                .WithMany()
                .HasForeignKey(x => x.DockId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(x => x.Driver)
                .WithMany()
                .HasForeignKey(x => x.DriverId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<VehicleAssignment>(entity =>
        {
            entity.ToTable("VehicleAssignments");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.VehicleId).IsRequired();
            entity.Property(x => x.UserId).IsRequired();
            entity.Property(x => x.AssignmentRole).IsRequired().HasMaxLength(30);
            entity.Property(x => x.IsActive).IsRequired();
            entity.Property(x => x.AssignedAtUtc).IsRequired();

            entity.HasIndex(x => x.VehicleId);
            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.IsActive);

            entity.HasOne(x => x.Vehicle)
                .WithMany()
                .HasForeignKey(x => x.VehicleId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.ToTable("Appointments");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Code).IsRequired().HasMaxLength(20);
            entity.Property(x => x.CargoType).IsRequired().HasMaxLength(80);
            entity.Property(x => x.Priority).IsRequired();
            entity.Property(x => x.Notes).HasMaxLength(1000);
            entity.Property(x => x.ScheduledStartUtc).IsRequired();
            entity.Property(x => x.ScheduledEndUtc).IsRequired();
            entity.Property(x => x.Status).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity.HasIndex(x => x.Code).IsUnique();
            entity.HasIndex(x => x.ScheduledStartUtc);
            entity.HasIndex(x => x.ScheduledEndUtc);
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.Priority);
            entity.HasIndex(x => x.YardId);
            entity.HasIndex(x => x.DockId);
            entity.HasIndex(x => x.VehicleId);

            entity.HasOne(x => x.Yard)
                .WithMany()
                .HasForeignKey(x => x.YardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Dock)
                .WithMany()
                .HasForeignKey(x => x.DockId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(x => x.Vehicle)
                .WithMany()
                .HasForeignKey(x => x.VehicleId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasMany(x => x.History)
                .WithOne(x => x.Appointment)
                .HasForeignKey(x => x.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AppointmentHistoryItem>(entity =>
        {
            entity.ToTable("AppointmentHistoryItems");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.AppointmentId).IsRequired();
            entity.Property(x => x.Status).IsRequired();
            entity.Property(x => x.AtUtc).IsRequired();
            entity.Property(x => x.Note).HasMaxLength(1000);
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity.HasIndex(x => x.AppointmentId);
            entity.HasIndex(x => x.AtUtc);
            entity.HasIndex(x => x.Status);
        });

        modelBuilder.Entity<GateActivity>(entity =>
        {
            entity.ToTable("GateActivities");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Type).IsRequired();
            entity.Property(x => x.GateName).IsRequired().HasMaxLength(80);
            entity.Property(x => x.OccurredAtUtc).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity.HasIndex(x => x.OccurredAtUtc);
            entity.HasIndex(x => x.Type);

            entity.HasOne(x => x.Vehicle)
                .WithMany()
                .HasForeignKey(x => x.VehicleId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(x => x.Driver)
                .WithMany()
                .HasForeignKey(x => x.DriverId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<GateAuditEvent>(entity =>
        {
            entity.ToTable("GateAuditEvents");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Action).IsRequired().HasMaxLength(80);
            entity.Property(x => x.Outcome).IsRequired().HasMaxLength(80);
            entity.Property(x => x.ActorRole).IsRequired().HasMaxLength(50);
            entity.Property(x => x.GateName).IsRequired().HasMaxLength(80);

            entity.Property(x => x.TrailerNumber).HasMaxLength(60);
            entity.Property(x => x.SealNumber).HasMaxLength(60);
            entity.Property(x => x.DockOrParking).HasMaxLength(120);
            entity.Property(x => x.DetailsJson);

            entity.Property(x => x.ActorUserId).IsRequired();
            entity.Property(x => x.OccurredAtUtc).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity.HasIndex(x => x.OccurredAtUtc);
            entity.HasIndex(x => x.Action);
            entity.HasIndex(x => x.GateName);
            entity.HasIndex(x => x.VehicleId);
            entity.HasIndex(x => x.DriverId);

            entity.HasOne<Vehicle>()
                .WithMany()
                .HasForeignKey(x => x.VehicleId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne<Driver>()
                .WithMany()
                .HasForeignKey(x => x.DriverId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<VehicleAuditLog>(entity =>
        {
            entity.ToTable("VehicleAuditLogs");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.VehicleId).IsRequired();
            entity.Property(x => x.ActorUserId).IsRequired();
            entity.Property(x => x.ActorRole).IsRequired().HasMaxLength(50);
            entity.Property(x => x.EventType).IsRequired().HasMaxLength(80);
            entity.Property(x => x.DetailsJson);
            entity.Property(x => x.OccurredAtUtc).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity.HasIndex(x => x.VehicleId);
            entity.HasIndex(x => x.OccurredAtUtc);
            entity.HasIndex(x => x.EventType);

            entity.HasOne(x => x.Vehicle)
                .WithMany()
                .HasForeignKey(x => x.VehicleId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
