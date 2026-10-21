import sys
import os
import random
import uuid
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SyncSessionLocal
from app.models import (
    User, BureauCell, Institution, Case, CaseAction,
    OverlapGroup, OverlapMember, AuditLog, SLAConfig, Notification
)
from app.services.auth_service import get_password_hash
from app.services.overlap_service import compute_embedding, cosine_similarity, compute_rule_score

REGIONS = ["Northern", "Southern", "Western", "Eastern", "Central"]
CATEGORIES = [
    "Faculty & Staff Grievance",
    "Admission & Capitation Fee",
    "Infrastructure & Facilities",
    "Ragging & Student Safety",
    "Maladministration & Harassment",
    "Examination & Degree Malpractice",
    "General Grievance"
]
STATUSES = ["Pending", "Under Process", "Disposed", "Transferred", "Escalated"]
COMPLAINANT_TYPES = ["Student", "Faculty", "Parent", "Anonymous", "Alumni"]

INSTITUTION_NAMES = [
    ("Delhi Institute of Technology & Management", "Northern", "New Delhi", "Delhi"),
    ("Punjab Engineering & Technical College", "Northern", "Chandigarh", "Punjab"),
    ("Haryana Institute of Advanced Computing", "Northern", "Gurugram", "Haryana"),
    ("Uttar Pradesh Institute of Technology", "Northern", "Lucknow", "Uttar Pradesh"),
    ("Jammu & Kashmir College of Engineering", "Northern", "Srinagar", "Jammu and Kashmir"),
    ("Uttarakhand Technical Academy", "Northern", "Dehradun", "Uttarakhand"),
    ("Himachal Pradesh College of Pharmacy", "Northern", "Shimla", "Himachal Pradesh"),
    ("Rajasthan Institute of Engineering", "Northern", "Jaipur", "Rajasthan"),
    ("Noida International Institute of Technology", "Northern", "Noida", "Uttar Pradesh"),
    ("Amritsar Academy of Technical Education", "Northern", "Amritsar", "Punjab"),
    ("Kanpur Institute of Management Studies", "Northern", "Kanpur", "Uttar Pradesh"),
    ("Roorkee Institute of Polytechnic & Technology", "Northern", "Roorkee", "Uttarakhand"),

    ("Chennai Institute of Technology & Science", "Southern", "Chennai", "Tamil Nadu"),
    ("Bangalore Institute of Advanced Computing", "Southern", "Bengaluru", "Karnataka"),
    ("Hyderabad Technical & Research University", "Southern", "Hyderabad", "Telangana"),
    ("Kerala College of Engineering & Research", "Southern", "Thiruvananthapuram", "Kerala"),
    ("Coimbatore Institute of Technology", "Southern", "Coimbatore", "Tamil Nadu"),
    ("Mysore Technical Academy", "Southern", "Mysuru", "Karnataka"),
    ("Warangal Institute of Pharmaceutical Sciences", "Southern", "Warangal", "Telangana"),
    ("Kochi Institute of Maritime Engineering", "Southern", "Kochi", "Kerala"),
    ("Visakhapatnam Engineering & Tech Academy", "Southern", "Visakhapatnam", "Andhra Pradesh"),
    ("Madurai College of Technology & Management", "Southern", "Madurai", "Tamil Nadu"),
    ("Tirupati Technical Institute", "Southern", "Tirupati", "Andhra Pradesh"),
    ("Mangalore Institute of Aeronautical Studies", "Southern", "Mangaluru", "Karnataka"),

    ("Mumbai Metropolitan College of Engineering", "Western", "Mumbai", "Maharashtra"),
    ("Pune Institute of Computer Technology", "Western", "Pune", "Maharashtra"),
    ("Ahmedabad Institute of Technology", "Western", "Ahmedabad", "Gujarat"),
    ("Goa Engineering & Nautical College", "Western", "Panaji", "Goa"),
    ("Nagpur Institute of Technology & Science", "Western", "Nagpur", "Maharashtra"),
    ("Surat College of Advanced Technology", "Western", "Surat", "Gujarat"),
    ("Nashik Academy of Engineering Research", "Western", "Nashik", "Maharashtra"),
    ("Vadodara Institute of Chemical Technology", "Western", "Vadodara", "Gujarat"),
    ("Aurangabad Institute of Technology", "Western", "Chhatrapati Sambhajinagar", "Maharashtra"),
    ("Rajkot Technical Campus", "Western", "Rajkot", "Gujarat"),
    ("Kolhapur Engineering & Management College", "Western", "Kolhapur", "Maharashtra"),
    ("Solapur Institute of Technology", "Western", "Solapur", "Maharashtra"),

    ("Kolkata Institute of Engineering & Technology", "Eastern", "Kolkata", "West Bengal"),
    ("Bhubaneswar Technical University College", "Eastern", "Bhubaneswar", "Odisha"),
    ("Patna Engineering & Applied Science College", "Eastern", "Patna", "Bihar"),
    ("Guwahati Institute of Technology & Design", "Eastern", "Guwahati", "Assam"),
    ("Ranchi College of Advanced Technology", "Eastern", "Ranchi", "Jharkhand"),
    ("Siliguri Technical Academy", "Eastern", "Siliguri", "West Bengal"),
    ("Cuttack Institute of Management & Science", "Eastern", "Cuttack", "Odisha"),
    ("Durgapur Institute of Engineering", "Eastern", "Durgapur", "West Bengal"),
    ("Jamshedpur Technical Institute", "Eastern", "Jamshedpur", "Jharkhand"),
    ("Agartala Polytechnic & Tech Academy", "Eastern", "Agartala", "Tripura"),
    ("Muzaffarpur Institute of Technology", "Eastern", "Muzaffarpur", "Bihar"),
    ("Shillong Engineering College", "Eastern", "Shillong", "Meghalaya"),

    ("Bhopal National Institute of Technology", "Central", "Bhopal", "Madhya Pradesh"),
    ("Indore Institute of Science & Technology", "Central", "Indore", "Madhya Pradesh"),
    ("Raipur Technical & Management Academy", "Central", "Raipur", "Chhattisgarh"),
    ("Jabalpur Engineering College Campus", "Central", "Jabalpur", "Madhya Pradesh"),
    ("Gwalior Institute of Computer Science", "Central", "Gwalior", "Madhya Pradesh"),
    ("Bilaspur Technical University College", "Central", "Bilaspur", "Chhattisgarh"),
    ("Ujjain College of Engineering & Research", "Central", "Ujjain", "Madhya Pradesh"),
    ("Durg Institute of Advanced Engineering", "Central", "Durg", "Chhattisgarh"),
    ("Sagar Technical & Polytechnic Institute", "Central", "Sagar", "Madhya Pradesh"),
    ("Korba Institute of Technology", "Central", "Korba", "Chhattisgarh"),
    ("Rewa Engineering & Medical Campus", "Central", "Rewa", "Madhya Pradesh"),
    ("Rajnandgaon Technical College", "Central", "Rajnandgaon", "Chhattisgarh")
]


def seed():
    session = SyncSessionLocal()
    try:
        print("--- Starting AICTE CaseTrack Database Seeding ---")

        # 1. Bureaus & Cells
        bureaus_data = [
            ("RB", "Regulation Bureau"),
            ("PGRC", "Public Grievance Redressal Cell"),
            ("AB", "Approval Bureau"),
            ("PAPB", "Policy & Academic Planning Bureau"),
            ("LC", "Legal Cell")
        ]
        bureau_map = {}
        for code, name in bureaus_data:
            existing = session.query(BureauCell).filter_by(code=code).first()
            if not existing:
                b = BureauCell(code=code, name=name)
                session.add(b)
                session.flush()
                bureau_map[code] = b
            else:
                bureau_map[code] = existing
        print(f"Bureaus verified: {list(bureau_map.keys())}")

        # 2. SLA Configurations
        sla_configs = [
            ("Faculty & Staff Grievance", 30, 5),
            ("Admission & Capitation Fee", 21, 4),
            ("Infrastructure & Facilities", 45, 7),
            ("Ragging & Student Safety", 14, 3),
            ("Maladministration & Harassment", 30, 5),
            ("Examination & Degree Malpractice", 25, 5),
            ("General Grievance", 30, 5)
        ]
        for cat, days, warn in sla_configs:
            cfg = session.query(SLAConfig).filter_by(category=cat).first()
            if not cfg:
                session.add(SLAConfig(category=cat, sla_days=days, warn_before_days=warn))
        session.flush()

        # 3. Demo Users
        users_data = [
            ("Admin Officer", "admin@aicte.gov.in", "Admin@123456", "Admin", None, None),
            ("Senior Director (Grievances)", "seniormanager@aicte.gov.in", "Senior@123456", "Senior Manager", None, None),
            ("PGRC Nodal Officer", "pgrc.officer@aicte.gov.in", "Pgrc@123456", "PGRC", bureau_map["PGRC"].id, None),
            ("Regulation Bureau Officer", "rb.officer@aicte.gov.in", "Rb@123456", "RB", bureau_map["RB"].id, None),
            ("Northern Regional Officer", "ro.north@aicte.gov.in", "North@123456", "Regional Office", None, "Northern")
        ]
        user_map = {}
        for name, email, pwd, role, b_id, reg in users_data:
            u = session.query(User).filter_by(email=email).first()
            if not u:
                u = User(
                    name=name,
                    email=email,
                    password_hash=get_password_hash(pwd),
                    role=role,
                    bureau_cell_id=b_id,
                    region=reg,
                    is_active=True,
                    is_approved=True
                )
                session.add(u)
                session.flush()
            user_map[role] = u
        print("Demo users seeded with credentials.")

        # 4. 60 Institutions
        institutions = []
        for idx, (name, region, city, state) in enumerate(INSTITUTION_NAMES, start=1):
            pid = f"1-{1002340 + idx}"
            inst = session.query(Institution).filter_by(aicte_permanent_id=pid).first()
            if not inst:
                inst = Institution(
                    aicte_permanent_id=pid,
                    name=name,
                    address=f"Plot No. {random.randint(12, 450)}, Institutional Area, Phase-{random.randint(1, 4)}",
                    city=city,
                    state=state,
                    region=region,
                    type=random.choice(["Engineering & Technology", "Management", "Pharmacy", "Polytechnic", "Applied Arts"]),
                    status="Active"
                )
                session.add(inst)
                session.flush()
            institutions.append(inst)
        print(f"60 Institutions initialized across 5 regions.")

        # 5. Seed 600 Cases (including at least 25 deliberate overlap scenarios)
        existing_cases_count = session.query(Case).count()
        if existing_cases_count < 600:
            print(f"Generating 600 cases (currently {existing_cases_count})...")
            now = datetime.now(timezone.utc)

            # Define 30 deliberate overlap pairs across first 30 institutions
            # Case A handled by PGRC, Case B handled by RB for the same institution with varying wording
            overlap_templates = [
                (
                    "Admission & Capitation Fee",
                    "Demanding unauthorized capitation fee of 2 Lakhs for B.Tech admission",
                    "The admission cell has withheld provisional admission slips until parents deposit Rs. 2,00,000 cash under development fund.",
                    "Collection of unapproved building fund and caution deposits without receipt",
                    "Management is forcing candidates to pay an arbitrary Rs. 2,00,000 building donation in cash to confirm direct allotment seats."
                ),
                (
                    "Faculty & Staff Grievance",
                    "Non-payment of mandatory 7th Central Pay Commission salaries to assistant professors",
                    "Faculty members in ECE and CSE departments have received only 50% basic pay for the last 8 months in direct violation of AICTE norms.",
                    "Withholding salaries and arbitrary pay cuts for teaching faculty",
                    "Administration has deducted half salary for teaching staff since September without notification or justification."
                ),
                (
                    "Infrastructure & Facilities",
                    "Inadequate computing lab facilities and sub-standard workshop equipment",
                    "Out of 120 computers in the main CAD lab, over 70 are non-functional and software licenses have lapsed since 2024.",
                    "Deficient lab infrastructure and expired technical software licenses",
                    "Laboratories lack operational systems and high-end workstations promised in the AICTE approval documentation."
                ),
                (
                    "Ragging & Student Safety",
                    "Ragging incidents reported in Boys Hostel Block C without Anti-Ragging Committee intervention",
                    "First-year students have been subjected to late-night physical intimidation by senior students with zero action from warden.",
                    "Violation of AICTE Anti-Ragging Regulations and lack of hostel security",
                    "Hostel management has ignored formal complaints from freshers regarding systemic harassment by seniors in campus dormitories."
                ),
                (
                    "Examination & Degree Malpractice",
                    "Withholding original degree certificates and demanding clearance dues",
                    "College registrar refuses to return original 10th and 12th certificates to graduates until unreceipted library fine is paid.",
                    "Unlawful retention of student original mark sheets and testimonials",
                    "Administration is retaining qualifying certificates of passing out batch demanding unlawful administrative charges."
                )
            ]

            created_cases = 0

            # First create the 30 pairs of deliberate overlaps (60 cases)
            for i in range(30):
                inst = institutions[i]
                tmpl = overlap_templates[i % len(overlap_templates)]
                category, title_pgrc, desc_pgrc, title_rb, desc_rb = tmpl

                rec_date1 = now - timedelta(days=random.randint(15, 60))
                rec_date2 = rec_date1 + timedelta(days=random.randint(2, 20))

                # Case 1: PGRC Under Process
                c1 = Case(
                    case_number=f"AICTE-PGRC-{202600 + i * 2 + 1}",
                    institution_id=inst.id,
                    category=category,
                    title=title_pgrc,
                    description=desc_pgrc,
                    complainant_type="Student" if "Fee" in category or "Ragging" in category else "Faculty",
                    received_date=rec_date1,
                    status="Under Process",
                    current_bureau_id=bureau_map["PGRC"].id,
                    assigned_officer_id=user_map["PGRC"].id,
                    last_action="Verification report sought from institution",
                    next_action="Review institutional compliance reply",
                    last_action_date=now - timedelta(days=random.randint(1, 5)),
                    expected_disposal_date=rec_date1 + timedelta(days=30),
                    sla_days=30,
                    embedding=compute_embedding(f"{title_pgrc} {desc_pgrc}"),
                    source="PGRC Web Portal"
                )
                session.add(c1)
                session.flush()

                # Case 2: RB Under Process or Action Initiated
                c2 = Case(
                    case_number=f"AICTE-RB-{202600 + i * 2 + 2}",
                    institution_id=inst.id,
                    category=category,
                    title=title_rb,
                    description=desc_rb,
                    complainant_type="Parent" if "Fee" in category else ("Student" if "Ragging" in category else "Faculty"),
                    received_date=rec_date2,
                    status="Under Process" if i % 2 == 0 else "Pending",
                    current_bureau_id=bureau_map["RB"].id,
                    assigned_officer_id=user_map["RB"].id,
                    last_action="Notice issued under Section 10(k)",
                    next_action="Fact-finding inquiry committee constitution",
                    last_action_date=now - timedelta(days=random.randint(1, 3)),
                    expected_disposal_date=rec_date2 + timedelta(days=30),
                    sla_days=30,
                    embedding=compute_embedding(f"{title_rb} {desc_rb}"),
                    source="Regulation Intake Form"
                )
                session.add(c2)
                session.flush()

                # Add actions
                a1 = CaseAction(
                    case_id=c1.id,
                    bureau_id=bureau_map["PGRC"].id,
                    officer_id=user_map["PGRC"].id,
                    action_type="Intake",
                    remarks="Complaint accepted and routed to PGRC examination cell."
                )
                a2 = CaseAction(
                    case_id=c2.id,
                    bureau_id=bureau_map["RB"].id,
                    officer_id=user_map["RB"].id,
                    action_type="Intake",
                    remarks="Regulatory notice issued based on complainant representation."
                )
                session.add_all([a1, a2])

                # Pre-link in OverlapGroup
                rule_s, rules_f = compute_rule_score(c1, c2)
                sem_s = cosine_similarity(c1.embedding, c2.embedding)
                fin_s = round(0.4 * rule_s + 0.6 * sem_s, 4)

                grp = OverlapGroup(
                    institution_id=inst.id,
                    score=fin_s,
                    rule_score=round(rule_s, 4),
                    semantic_score=round(sem_s, 4),
                    severity="High" if fin_s >= 0.75 else "Medium",
                    status="Open",
                    explanation=f"Potential Overlapping Cases – Coordination Required between PGRC ({c1.case_number}) and RB ({c2.case_number}). Match confidence: {fin_s * 100:.1f}%.",
                    rules_fired=rules_f
                )
                session.add(grp)
                session.flush()

                m1 = OverlapMember(group_id=grp.id, case_id=c1.id, role="primary", similarity_score=fin_s)
                m2 = OverlapMember(group_id=grp.id, case_id=c2.id, role="secondary", similarity_score=fin_s)
                session.add_all([m1, m2])

                created_cases += 2

            print(f"Created 30 deliberate inter-bureau overlap clusters ({created_cases} cases).")

            # Now create the remaining 540 cases across all institutions
            bureau_list = list(bureau_map.values())
            for c_idx in range(created_cases + 1, 601):
                inst = random.choice(institutions)
                cat = random.choice(CATEGORIES)
                bureau = random.choice(bureau_list)
                c_type = random.choice(COMPLAINANT_TYPES)
                case_status = random.choices(
                    STATUSES,
                    weights=[0.25, 0.35, 0.22, 0.10, 0.08],
                    k=1
                )[0]

                # Varied dates: some fresh, some 15-45 days old, some overdue (>45 days)
                age_days = random.choices(
                    [random.randint(1, 10), random.randint(12, 28), random.randint(32, 50), random.randint(55, 120)],
                    weights=[0.30, 0.35, 0.20, 0.15],
                    k=1
                )[0]
                rec_date = now - timedelta(days=age_days)
                sla_days = 30
                exp_date = rec_date + timedelta(days=sla_days)

                title = f"{cat} incident reported at {inst.name.split()[0]} Campus"
                desc = (
                    f"Formal complaint submitted regarding {cat.lower()} concerning departmental administration, "
                    f"student services, and statutory AICTE compliance benchmarks. Received on {rec_date.strftime('%d %B %Y')}."
                )

                assigned_user = user_map.get(bureau.code) or user_map["Admin"]

                case_obj = Case(
                    case_number=f"AICTE-{bureau.code}-{datetime.now().year}{c_idx:04d}",
                    institution_id=inst.id,
                    category=cat,
                    title=title,
                    description=desc,
                    complainant_type=c_type,
                    received_date=rec_date,
                    status=case_status,
                    current_bureau_id=bureau.id,
                    assigned_officer_id=assigned_user.id,
                    last_action=f"Case status marked as {case_status}",
                    next_action="Routine review & verification" if case_status != "Disposed" else "Case Closed",
                    last_action_date=now - timedelta(days=random.randint(1, 10)),
                    expected_disposal_date=exp_date,
                    sla_days=sla_days,
                    embedding=compute_embedding(f"{title} {desc}"),
                    source=random.choice(["Portal Intake", "Central Grievance Portal", "Email Intake", "Postal Grievance"])
                )
                session.add(case_obj)
                session.flush()

                action = CaseAction(
                    case_id=case_obj.id,
                    bureau_id=bureau.id,
                    officer_id=assigned_user.id,
                    action_type="Status Update",
                    remarks=f"Case registered and currently marked as {case_status}."
                )
                session.add(action)

            session.commit()
            print("Successfully seeded 600 cases, deliberate overlap groups, and actions!")
        else:
            print("Cases already seeded.")

        print("--- Seed script completed successfully! ---")
    except Exception as e:
        session.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        session.close()


if __name__ == "__main__":
    seed()
