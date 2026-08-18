from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import json
from masterdata.models import Category, SubCategory, Priority, SLARule, Department, Team, SeverityRule, Product, KnowledgeArticle

User = get_user_model()


class Command(BaseCommand):
    help = "Seed initial master data, knowledge base, and demo users."

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

        # 6. Knowledge Base Articles
        kb_articles = [
            {
                "article_id": "KB-NET-001",
                "title": "Corporate VPN Connection & Troubleshooting Guide",
                "category": "Network",
                "sub_category": "VPN",
                "tags": "vpn, anyconnect, remote, connectivity, gateway, tunnel",
                "content": "Comprehensive guide to resolve VPN connection drops, gateway unreachable errors, and Cisco AnyConnect handshake failures.",
                "steps": json.dumps([
                    "Verify your local internet connection is active by loading a public webpage.",
                    "Confirm the VPN server address matches 'vpn.company.com' in your client profile.",
                    "Restart the Cisco AnyConnect / GlobalProtect VPN service from task manager.",
                    "Check that port 443 / UDP 500/4500 is not restricted on your local network.",
                    "Clear cached VPN credentials and re-authenticate via company SSO.",
                ]),
                "source": "Enterprise IT Knowledge Base / Network Operations",
            },
            {
                "article_id": "KB-NET-002",
                "title": "Office & Broadband Network Connectivity Troubleshooting",
                "category": "Network",
                "sub_category": "Internet",
                "tags": "internet, wifi, wi-fi, broadband, dns, gateway, disconnected, network down",
                "content": "Troubleshooting steps for office broadband and Wi-Fi connectivity loss, DNS resolution failures, and network adapter resets.",
                "steps": json.dumps([
                    "Verify router / modem power indicators and physical ethernet cable connections.",
                    "Toggle Wi-Fi adapter off and on or flush local DNS cache via 'ipconfig /flushdns'.",
                    "Verify DHCP default gateway assignment and DNS server responsiveness.",
                    "Check if the ISP or local broadband provider is experiencing an area-wide outage.",
                    "Contact the Network Operations Team if corporate gateway remains unreachable.",
                ]),
                "source": "Network Operations Service Desk",
            },
            {
                "article_id": "KB-SEC-002",
                "title": "Security Incident Response — Phishing & Suspicious Emails",
                "category": "Security",
                "sub_category": "Phishing",
                "tags": "phishing, malware, security, suspicious, email, attachment, attack",
                "content": "Emergency protocol for handling phishing emails, credential harvesting attempts, and suspicious links.",
                "steps": json.dumps([
                    "Do NOT click any links or download attachments from the suspicious message.",
                    "Use the 'Report Phishing' button in Outlook to submit headers to SecOps.",
                    "If you entered credentials, change your corporate password immediately via SSO portal.",
                    "Disconnect your machine from Wi-Fi if unauthorized downloads occurred.",
                    "SecOps will review message telemetry and quarantine threat vectors.",
                ]),
                "source": "SecOps Security Guidelines v3.4",
            },
            {
                "article_id": "KB-AUTH-003",
                "title": "SSO Login & Self-Service Password Reset",
                "category": "Authentication",
                "sub_category": "Password Reset",
                "tags": "password, sso, mfa, login, locked, authentication, credentials",
                "content": "Self-service password recovery, MFA re-registration, and account unlock procedures.",
                "steps": json.dumps([
                    "Navigate to the self-service portal: sso.company.com/recovery.",
                    "Enter your corporate email address to receive an MFA verification push.",
                    "Follow the on-screen prompts to set a new 12+ character complex password.",
                    "Wait 2 minutes for directory synchronization across corporate services.",
                    "Log in to your workstation with the new password.",
                ]),
                "source": "Identity & Access Management Policy",
            },
            {
                "article_id": "KB-HDW-004",
                "title": "Workstation & Laptop Diagnostics and Performance Optimization",
                "category": "Hardware",
                "sub_category": "Laptop",
                "tags": "laptop, hardware, slow, freeze, monitor, battery, keyboard, screen",
                "content": "Hardware troubleshooting for slow performance, thermal throttling, peripherals, and display issues.",
                "steps": json.dumps([
                    "Perform a full restart to flush system RAM and pending updates.",
                    "Check Task Manager for runaway background processes consuming > 80% CPU.",
                    "Verify the device has at least 15 GB free disk space on the primary drive.",
                    "Inspect physical cable connections for external displays and docks.",
                    "Run hardware diagnostics utility via Dell Command / Apple Diagnostics.",
                ]),
                "source": "Hardware Lifecycle & Asset Support Desk",
            },
            {
                "article_id": "KB-SFT-005",
                "title": "Application Crash Recovery & License Verification",
                "category": "Software",
                "sub_category": "Application Error",
                "tags": "software, crash, error, application, license, install, bug",
                "content": "Guide for software crash loops, corrupted caches, and license reactivation.",
                "steps": json.dumps([
                    "Force-close all instances of the application using Task Manager.",
                    "Clear local application cache files located in %LOCALAPPDATA% or ~/Library/Caches.",
                    "Check Company Portal / Software Center for pending application updates.",
                    "Run the built-in application repair wizard from Add/Remove Programs.",
                    "Reboot your computer and relaunch the application as Administrator.",
                ]),
                "source": "Software Packaging & Application Support",
            },
            {
                "article_id": "KB-EML-006",
                "title": "Outlook Sync & Mailbox Recovery Guide",
                "category": "Email",
                "sub_category": "Outlook Sync",
                "tags": "outlook, email, sync, exchange, calendar, mailbox, delivery",
                "content": "Resolving Outlook synchronization stalls, OST file corruption, and mailbox quota issues.",
                "steps": json.dumps([
                    "Verify Outlook status shows 'Connected to Microsoft Exchange' in the status bar.",
                    "Toggle Outlook into Work Offline mode, wait 10 seconds, then reconnect.",
                    "Run Outlook in Safe Mode (outlook.exe /safe) to disable conflicting add-ins.",
                    "Rebuild the local Outlook data file (.OST) via Account Settings.",
                    "Check Office 365 webmail (outlook.office.com) to verify cloud mailbox health.",
                ]),
                "source": "Messaging & Collaboration Services",
            },
            {
                "article_id": "KB-BIL-007",
                "title": "Invoice Reconciliation & Billing Inquiry Guide",
                "category": "Billing",
                "sub_category": "Invoice",
                "tags": "billing, invoice, payment, subscription, charge, receipt, finance",
                "content": "Procedures for resolving corporate invoice discrepancies, credit card charge failures, and license renewals.",
                "steps": json.dumps([
                    "Verify billing entity details and PO reference numbers on the disputed invoice.",
                    "Cross-reference billing statement with ERP purchase orders and payment gateways.",
                    "If payment failed, check credit card expiration date and bank merchant authorization.",
                    "Submit receipt and transaction reference to the Finance Accounts team.",
                ]),
                "source": "Finance & Accounts Operations",
            },
        ]

        for article_data in kb_articles:
            KnowledgeArticle.objects.update_or_create(
                article_id=article_data["article_id"],
                defaults=article_data
            )

        # 7. Default Demo Users
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

        self.stdout.write(self.style.SUCCESS("Successfully seeded master data, knowledge base, and default users."))

