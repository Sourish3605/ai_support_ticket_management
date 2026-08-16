from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from masterdata.models import Category, SubCategory, Priority, SLARule, Department, Team, SeverityRule, Product

User = get_user_model()


class Command(BaseCommand):
    help = "Seed initial master data and demo users according to Milestone 1 spec."

    def handle(self, *args, **options):
        # 1. Departments & Teams
        depts_data = [
            ("IT Support", ["L1 Support", "Service Desk"]),
            ("Network Team", ["Network Ops", "VPN & Gateway"]),
            ("Hardware Team", ["Device Support", "Asset Management"]),
            ("Security Team", ["SecOps", "Identity & Access"]),
            ("Software Team", ["App Support", "Cloud Infrastructure"]),
            ("Finance", ["Payroll", "Accounts"]),
        ]

        for dept_name, team_names in depts_data:
            dept, _ = Department.objects.get_or_create(name=dept_name)
            for team_name in team_names:
                Team.objects.get_or_create(name=team_name, department=dept)

        # 2. Categories and Sub-categories
        categories_data = {
            "Network": ["VPN", "Internet", "Wi-Fi", "DNS / Gateway", "Firewall"],
            "Security": ["Phishing", "Malware", "Unauthorized Access", "Security Alert"],
            "Authentication": ["Password Reset", "Login Issue", "MFA / SSO", "Account Locked"],
            "Hardware": ["Laptop", "Desktop", "Monitor", "Keyboard / Mouse", "Printer"],
            "Software": ["Application Error", "Crash", "License Expired", "Installation"],
            "Email": ["Outlook Sync", "Calendar Issue", "Spam", "Delivery Failure"],
            "Billing": ["Invoice", "Payment Failure", "Subscription"],
        }

        for cat_name, sub_cats in categories_data.items():
            cat, _ = Category.objects.get_or_create(name=cat_name)
            for sub_name in sub_cats:
                SubCategory.objects.get_or_create(category=cat, name=sub_name)

        # 3. Priorities & SLA Rules
        priorities_data = [
            ("P1", "Critical", 1, 1, 4),      # response_hours, resolution_hours
            ("P2", "High", 2, 2, 8),
            ("P3", "Medium", 3, 4, 24),
            ("P4", "Low", 4, 8, 48),
        ]

        for code, name, level, resp_hrs, res_hrs in priorities_data:
            prio, _ = Priority.objects.get_or_create(code=code, defaults={"name": name, "level": level})
            SLARule.objects.get_or_create(priority=prio, defaults={"response_hours": resp_hrs, "resolution_hours": res_hrs})

        # 4. Severity Rules
        severities = [
            ("Critical", "Total business stoppage, security breach, enterprise outage", "P1"),
            ("High", "Major productivity block, critical tool down for a team", "P2"),
            ("Medium", "Single user blocked with workaround, performance degradation", "P3"),
            ("Low", "Minor cosmetic issue, general inquiry, non-urgent request", "P4"),
        ]
        for code, desc, prio in severities:
            SeverityRule.objects.get_or_create(code=code, defaults={"description": desc, "suggested_priority": prio})

        # 5. Products
        products = ["SupportPilot Enterprise", "Corporate VPN", "SSO Portal", "Office 365 Suite", "Jira Integration"]
        for p in products:
            Product.objects.get_or_create(name=p)

        # 6. Default Demo Users
        # Admin
        if not User.objects.filter(username="admin").exists():
            admin_user = User.objects.create_superuser("admin", "admin@company.com", "admin123")
            admin_user.first_name = "Support"
            admin_user.last_name = "Admin"
            admin_user.save()

        # Employee (Arun)
        if not User.objects.filter(username="arun@company.com").exists():
            arun = User.objects.create_user("arun@company.com", "arun@company.com", "password123")
            arun.first_name = "Arun"
            arun.last_name = "Kumar"
            arun.save()

        # Support Agent (Bala)
        if not User.objects.filter(username="bala@company.com").exists():
            bala = User.objects.create_user("bala@company.com", "bala@company.com", "password123")
            bala.first_name = "Bala"
            bala.last_name = "Raman"
            bala.is_staff = True
            bala.save()

        self.stdout.write(self.style.SUCCESS("Successfully seeded master data and default users."))
