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
        # Remove deprecated users
        User.objects.filter(email__in=["arun@company.com", "bala@company.com", "admin@company.com"]).delete()
        User.objects.filter(username__in=["arun", "bala"]).delete()

        # Primary Demo Credentials
        # 1. Admin (admin@gmail.com)
        admin_u, _ = User.objects.get_or_create(username="admin@gmail.com", defaults={"email": "admin@gmail.com"})
        admin_u.email = "admin@gmail.com"
        admin_u.first_name = "Admin"
        admin_u.is_staff = True
        admin_u.is_superuser = True
        admin_u.set_password("password123")
        admin_u.save()

        # 2. Agent (agent@gmail.com)
        agent_u, _ = User.objects.get_or_create(username="agent@gmail.com", defaults={"email": "agent@gmail.com"})
        agent_u.email = "agent@gmail.com"
        agent_u.first_name = "Agent"
        agent_u.is_staff = True
        agent_u.is_superuser = False
        agent_u.set_password("password123")
        agent_u.save()

        # 3. Customer (customer@gmail.com)
        cust_u, _ = User.objects.get_or_create(username="customer@gmail.com", defaults={"email": "customer@gmail.com"})
        cust_u.email = "customer@gmail.com"
        cust_u.first_name = "Customer"
        cust_u.is_staff = False
        cust_u.is_superuser = False
        cust_u.set_password("password123")
        cust_u.save()

        # Additional specific users
        # Admin (sourish)
        sourish_user, _ = User.objects.get_or_create(username="sourish@gmail.com", defaults={"email": "sourish@gmail.com"})
        sourish_user.email = "sourish@gmail.com"
        sourish_user.first_name = "sourish"
        sourish_user.is_staff = True
        sourish_user.is_superuser = True
        sourish_user.set_password("password123")
        sourish_user.save()

        # Agent (yogitha)
        yogitha_user, _ = User.objects.get_or_create(username="yogitha@gmail.com", defaults={"email": "yogitha@gmail.com"})
        yogitha_user.email = "yogitha@gmail.com"
        yogitha_user.first_name = "yogitha"
        yogitha_user.is_staff = True
        yogitha_user.is_superuser = False
        yogitha_user.set_password("password123")
        yogitha_user.save()

        # Agent (premalatha)
        prema_user, _ = User.objects.get_or_create(username="premalatha@gmail.com", defaults={"email": "premalatha@gmail.com"})
        prema_user.email = "premalatha@gmail.com"
        prema_user.first_name = "premalatha"
        prema_user.is_staff = True
        prema_user.is_superuser = False
        prema_user.set_password("password123")
        prema_user.save()

        # Customer / Employee (devipriya)
        devi_user, _ = User.objects.get_or_create(username="devipriya@gmail.com", defaults={"email": "devipriya@gmail.com"})
        devi_user.email = "devipriya@gmail.com"
        devi_user.first_name = "devipriya"
        devi_user.is_staff = False
        devi_user.is_superuser = False
        devi_user.set_password("password123")
        devi_user.save()

        self.stdout.write(self.style.SUCCESS("Successfully seeded master data and default users (admin@gmail.com, agent@gmail.com, customer@gmail.com)."))
