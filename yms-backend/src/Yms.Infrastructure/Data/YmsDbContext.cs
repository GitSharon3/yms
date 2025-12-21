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
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<GateActivity> GateActivities => Set<GateActivity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Email).IsRequired().HasMaxLength(254);
            entity.Property(x => x.Username).IsRequired().HasMaxLength(50);
            entity.Property(x => x.PasswordHash).IsRequired();
            entity.Property(x => x.PasswordSalt).IsRequired();
            entity.Property(x => x.PasswordIterations).IsRequired();
            entity.Property(x => x.Role).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();

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

            entity.Property(x => x.FirstName).IsRequired().HasMaxLength(80);
            entity.Property(x => x.LastName).IsRequired().HasMaxLength(80);
            entity.Property(x => x.Phone).HasMaxLength(30);
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity.HasIndex(x => x.Phone);
        });

        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.ToTable("Vehicles");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.VehicleNumber).IsRequired().HasMaxLength(40);
            entity.Property(x => x.Type).IsRequired();
            entity.Property(x => x.Status).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity.HasIndex(x => x.VehicleNumber).IsUnique();
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.YardSectionId);
            entity.HasIndex(x => x.DockId);

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

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.ToTable("Appointments");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.ScheduledStartUtc).IsRequired();
            entity.Property(x => x.ScheduledEndUtc).IsRequired();
            entity.Property(x => x.Status).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity.HasIndex(x => x.ScheduledStartUtc);
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.YardId);

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
    }
}
