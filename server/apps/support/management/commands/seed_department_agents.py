from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.staff.models import Profile

User = get_user_model()

DEPARTMENT_AGENTS = [
    # --- IT Department (4 Agents) ---
    {
        "username": "yogitha",
        "email": "yogitha@gmail.com",
        "first_name": "Yogitha",
        "last_name": "R.",
        "department": "IT Department",
        "role": "Agent",
        "title": "Senior IT Systems Specialist",
        "availability_status": "AVAILABLE",
    },
    {
        "username": "premalatha",
        "email": "premalatha@gmail.com",
        "first_name": "Premalatha",
        "last_name": "S.",
        "department": "IT Department",
        "role": "Agent",
        "title": "Network & Infrastructure Specialist",
        "availability_status": "AVAILABLE",
    },
    {
        "username": "agent",
        "email": "agent@gmail.com",
        "first_name": "Alex",
        "last_name": "Chen",
        "department": "IT Department",
        "role": "Agent",
        "title": "IT Support Desk Lead",
        "availability_status": "AVAILABLE",
    },
    {
        "username": "david_it",
        "email": "david_it@gmail.com",
        "first_name": "David",
        "last_name": "Miller",
        "department": "IT Department",
        "role": "Agent",
        "title": "Hardware & End-User Computing",
        "availability_status": "AVAILABLE",
    },

    # --- HR Department (2 Agents) ---
    {
        "username": "sarah_hr",
        "email": "sarah_hr@gmail.com",
        "first_name": "Sarah",
        "last_name": "Jenkins",
        "department": "HR Department",
        "role": "Agent",
        "title": "HR Operations Specialist",
        "availability_status": "AVAILABLE",
    },
    {
        "username": "rachel_hr",
        "email": "rachel_hr@gmail.com",
        "first_name": "Rachel",
        "last_name": "Adams",
        "department": "HR Department",
        "role": "Agent",
        "title": "Payroll & Benefits Coordinator",
        "availability_status": "AVAILABLE",
    },

    # --- Finance Department (2 Agents) ---
    {
        "username": "michael_fin",
        "email": "michael_fin@gmail.com",
        "first_name": "Michael",
        "last_name": "Chang",
        "department": "Finance Department",
        "role": "Agent",
        "title": "Billing & Payments Analyst",
        "availability_status": "AVAILABLE",
    },
    {
        "username": "emma_fin",
        "email": "emma_fin@gmail.com",
        "first_name": "Emma",
        "last_name": "Watson",
        "department": "Finance Department",
        "role": "Agent",
        "title": "Finance Operations Specialist",
        "availability_status": "AVAILABLE",
    },

    # --- Manager ---
    {
        "username": "manager",
        "email": "manager@gmail.com",
        "first_name": "Operations",
        "last_name": "Manager",
        "department": "Operations",
        "role": "Manager",
        "title": "Global Support Desk Manager",
        "availability_status": "AVAILABLE",
    }
]


class Command(BaseCommand):
    help = "Seeds department agents across IT, HR, and Finance departments."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding department agents..."))

        for ag in DEPARTMENT_AGENTS:
            user, created = User.objects.get_or_create(username=ag["username"])
            user.email = ag["email"]
            user.first_name = ag["first_name"]
            user.last_name = ag["last_name"]
            user.is_staff = True
            if ag["role"] == "Admin":
                user.is_superuser = True
            user.set_password("password123")
            user.save()

            profile, _ = Profile.objects.get_or_create(user=user)
            profile.role = ag["role"]
            profile.department = ag["department"]
            profile.availability_status = ag["availability_status"]
            profile.title = ag["title"]
            profile.save()

            status_str = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ {status_str}: {user.username} ({ag['department']} - {ag['title']}) [{ag['availability_status']}]"
                )
            )

        self.stdout.write(self.style.SUCCESS("All department agents seeded successfully!"))
