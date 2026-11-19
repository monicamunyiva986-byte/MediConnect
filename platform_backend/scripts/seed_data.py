"""
Seed script – run with:
    python manage.py shell < scripts/seed_data.py
"""
from django.contrib.auth import get_user_model
from hospitals.models import Hospital, Department, HospitalStaff
from resources.models import (
    ResourceCategory,
    ResourceType,
    HospitalResource,
    ResourceTransaction,
    BloodStock,
    OxygenSupply,
)
from contracts.models import WorkContract, Bid, ContractAssignment
from notifications.models import Notification, NotificationPreference
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

User = get_user_model()

print("Seeding data...")

# --- Users ---
admin, _ = User.objects.get_or_create(
    email='admin@platform.local',
    defaults={
        'first_name': 'Platform',
        'last_name': 'Admin',
        'role': User.Role.ADMIN,
        'is_staff': True,
        'is_superuser': True,
        'is_verified': True,
    }
)
if not admin.has_usable_password():
    admin.set_password('AdminPass123!')
    admin.save()

hospital_admin, _ = User.objects.get_or_create(
    email='admin@nairobi-general.local',
    defaults={
        'first_name': 'Sarah',
        'last_name': 'Mwangi',
        'role': User.Role.HOSPITAL_ADMIN,
        'is_verified': True,
        'phone': '+254712345678',
    }
)
if not hospital_admin.has_usable_password():
    hospital_admin.set_password('HospitalPass123!')
    hospital_admin.save()

doctor, _ = User.objects.get_or_create(
    email='dr.kamau@example.com',
    defaults={
        'first_name': 'James',
        'last_name': 'Kamau',
        'role': User.Role.DOCTOR,
        'license_number': 'KMPDB-98765',
        'specialization': 'Emergency Medicine',
        'years_of_experience': 12,
        'is_verified': True,
        'phone': '+254722111222',
    }
)
if not doctor.has_usable_password():
    doctor.set_password('DoctorPass123!')
    doctor.save()

nurse, _ = User.objects.get_or_create(
    email='nurse.wani@example.com',
    defaults={
        'first_name': 'Amina',
        'last_name': 'Wani',
        'role': User.Role.NURSE,
        'license_number': 'NCK-45678',
        'specialization': 'Critical Care',
        'years_of_experience': 7,
        'is_verified': True,
    }
)
if not nurse.has_usable_password():
    nurse.set_password('NursePass123!')
    nurse.save()

print("Users created.")

# --- Hospital ---
hospital, _ = Hospital.objects.get_or_create(
    registration_number='MOH-NBI-001',
    defaults={
        'name': 'Nairobi General Hospital',
        'address': 'Hospital Road, Upper Hill',
        'city': 'Nairobi',
        'country': 'Kenya',
        'phone': '+254202000000',
        'email': 'info@nairobi-general.local',
        'description': 'Major referral hospital in Nairobi.',
        'latitude': Decimal('-1.2921'),
        'longitude': Decimal('36.8219'),
    }
)

icu, _ = Department.objects.get_or_create(
    hospital=hospital, name='Intensive Care Unit',
    defaults={'description': 'Adult ICU'}
)
er, _ = Department.objects.get_or_create(
    hospital=hospital, name='Emergency Department',
    defaults={'description': '24/7 Emergency'}
)

HospitalStaff.objects.get_or_create(
    user=hospital_admin, hospital=hospital,
    defaults={'role_at_hospital': 'ADMIN', 'is_primary': True}
)

print("Hospital & departments created.")

# --- Resource categories & types ---
beds_cat, _ = ResourceCategory.objects.get_or_create(
    slug='beds',
    defaults={'name': 'Beds', 'is_critical': True, 'unit_label': 'beds', 'icon': 'bed'}
)
blood_cat, _ = ResourceCategory.objects.get_or_create(
    slug='blood',
    defaults={'name': 'Blood', 'is_critical': True, 'unit_label': 'units', 'icon': 'blood'}
)
oxygen_cat, _ = ResourceCategory.objects.get_or_create(
    slug='oxygen',
    defaults={'name': 'Oxygen', 'is_critical': True, 'unit_label': 'units / litres', 'icon': 'oxygen'}
)
meds_cat, _ = ResourceCategory.objects.get_or_create(
    slug='medications',
    defaults={'name': 'Medications', 'is_critical': False, 'unit_label': 'vials / packs', 'icon': 'pill'}
)

icu_bed, _ = ResourceType.objects.get_or_create(
    category=beds_cat, name='ICU Bed',
    defaults={'code': 'BED-ICU'}
)
general_bed, _ = ResourceType.objects.get_or_create(
    category=beds_cat, name='General Ward Bed',
    defaults={'code': 'BED-GEN'}
)

HospitalResource.objects.get_or_create(
    hospital=hospital, resource_type=icu_bed, department=icu,
    defaults={
        'total_capacity': 20,
        'available_quantity': 4,
        'low_stock_threshold': 3,
        'updated_by': hospital_admin,
    }
)
HospitalResource.objects.get_or_create(
    hospital=hospital, resource_type=general_bed, department=None,
    defaults={
        'total_capacity': 120,
        'available_quantity': 35,
        'low_stock_threshold': 15,
        'updated_by': hospital_admin,
    }
)

# Blood
for group in ['O+', 'O-', 'A+', 'B+', 'AB+']:
    BloodStock.objects.get_or_create(
        hospital=hospital, blood_group=group, component='WHOLE', batch_number='',
        defaults={'units_available': 15 if group != 'O-' else 4, 'low_stock_threshold': 5}
    )

# Oxygen
OxygenSupply.objects.get_or_create(
    hospital=hospital, supply_type='CYLINDER',
    defaults={
        'capacity_litres': Decimal('4000'),
        'current_level_litres': Decimal('2800'),
        'number_of_units': 40,
        'available_units': 28,
        'updated_by': hospital_admin,
    }
)

print("Resources seeded.")

# --- Sample open contract ---
start = timezone.now() + timedelta(days=2)
end = start + timedelta(hours=12)
contract, created = WorkContract.objects.get_or_create(
    hospital=hospital,
    title='Night Emergency Physician – Weekend Cover',
    defaults={
        'department': er,
        'created_by': hospital_admin,
        'description': 'Experienced emergency physician needed for night shift covering the ED. Must be comfortable with trauma and acute medical cases.',
        'contract_type': 'SHIFT',
        'required_role': 'DOCTOR',
        'specialization_required': 'Emergency Medicine',
        'min_years_experience': 5,
        'start_datetime': start,
        'end_datetime': end,
        'budget_min': Decimal('15000'),
        'budget_max': Decimal('25000'),
        'currency': 'KES',
        'payment_type': 'SHIFT',
        'urgency': 'HIGH',
        'status': 'OPEN',
        'published_at': timezone.now(),
        'requirements': ['Valid KMPDB license', 'ACLS certification', 'At least 5 years ED experience'],
    }
)
if created:
    print("Sample contract created.")
sample_contract = contract

# --- Additional synthetic hospitals, staff, and departments ---
hospital_specs = [
    ('Mombasa', Decimal('-4.0435'), Decimal('39.6682')),
    ('Kisumu', Decimal('-0.0917'), Decimal('34.7680')),
    ('Nakuru', Decimal('-0.3031'), Decimal('36.0800')),
    ('Eldoret', Decimal('0.5143'), Decimal('35.2698')),
    ('Thika', Decimal('-1.0333'), Decimal('37.0693')),
    ('Nyeri', Decimal('-0.4167'), Decimal('36.9500')),
    ('Meru', Decimal('0.0467'), Decimal('37.6559')),
    ('Kakamega', Decimal('0.2827'), Decimal('34.7519')),
    ('Malindi', Decimal('-3.2175'), Decimal('40.1191')),
    ('Kitale', Decimal('1.0157'), Decimal('35.0062')),
    ('Garissa', Decimal('-0.4532'), Decimal('39.6461')),
    ('Machakos', Decimal('-1.5177'), Decimal('37.2634')),
    ('Kericho', Decimal('-0.3676'), Decimal('35.2831')),
    ('Naivasha', Decimal('-0.7172'), Decimal('36.4310')),
    ('Embu', Decimal('-0.5390'), Decimal('37.4575')),
    ('Kisii', Decimal('-0.6773'), Decimal('34.7796')),
    ('Bungoma', Decimal('0.5635'), Decimal('34.5606')),
    ('Voi', Decimal('-3.3961'), Decimal('38.5561')),
    ('Nanyuki', Decimal('0.0167'), Decimal('37.0728')),
    ('Lodwar', Decimal('3.1191'), Decimal('35.5964')),
    ('Migori', Decimal('-1.0634'), Decimal('34.4731')),
    ('Kilifi', Decimal('-3.6305'), Decimal('39.8499')),
    ('Isiolo', Decimal('0.3546'), Decimal('37.5822')),
    ('Kitui', Decimal('-1.3667'), Decimal('38.0106')),
]

department_names = [
    'Emergency Department',
    'General Medicine',
    'Surgery',
    'Intensive Care Unit',
    'Maternity',
    'Pediatrics',
]
demo_hospitals = [hospital]
hospital_admins = [hospital_admin]
all_departments = {hospital.pk: {'Intensive Care Unit': icu, 'Emergency Department': er}}

for index, (city, latitude, longitude) in enumerate(hospital_specs, start=2):
    registration_number = f'DEMO-KE-{index:03d}'
    demo_hospital, _ = Hospital.objects.get_or_create(
        registration_number=registration_number,
        defaults={
            'name': f'{city} Regional Demo Hospital',
            'address': f'{index} Example Avenue',
            'city': city,
            'country': 'Kenya',
            'phone': '+254700000000',
            'email': f'hospital{index:03d}@demo.health.test',
            'description': 'Synthetic hospital record for development and testing.',
            'latitude': latitude,
            'longitude': longitude,
        },
    )
    demo_hospitals.append(demo_hospital)

    admin_email = f'admin.hospital{index:03d}@demo.health.test'
    demo_admin, admin_created = User.objects.get_or_create(
        email=admin_email,
        defaults={
            'first_name': f'Hospital {index}',
            'last_name': 'Administrator',
            'role': User.Role.HOSPITAL_ADMIN,
            'is_verified': True,
            'phone': '+254700000000',
        },
    )
    if admin_created or not demo_admin.has_usable_password():
        demo_admin.set_password('TestPass123!')
        demo_admin.save()
    hospital_admins.append(demo_admin)

    department_map = {}
    for department_name in department_names:
        department, _ = Department.objects.get_or_create(
            hospital=demo_hospital,
            name=department_name,
            defaults={'description': f'{department_name} at {demo_hospital.name}.'},
        )
        department_map[department_name] = department
    all_departments[demo_hospital.pk] = department_map

    HospitalStaff.objects.get_or_create(
        user=demo_admin,
        hospital=demo_hospital,
        defaults={'role_at_hospital': 'ADMIN', 'is_primary': True},
    )

for demo_hospital in demo_hospitals:
    department_map = all_departments[demo_hospital.pk]
    for department_name in department_names:
        department_map[department_name], _ = Department.objects.get_or_create(
            hospital=demo_hospital,
            name=department_name,
            defaults={'description': f'{department_name} at {demo_hospital.name}.'},
        )

# --- Additional synthetic healthcare professionals ---
professional_specs = [
    (User.Role.DOCTOR, 'Emergency Medicine'),
    (User.Role.NURSE, 'Critical Care'),
    (User.Role.SPECIALIST, 'Cardiology'),
]
professionals = [doctor, nurse]
for index in range(1, 19):
    role, specialty = professional_specs[(index - 1) % len(professional_specs)]
    email = f'professional{index:03d}@demo.health.test'
    professional, created = User.objects.get_or_create(
        email=email,
        defaults={
            'first_name': f'Demo Professional {index}',
            'last_name': 'Test',
            'role': role,
            'license_number': f'DEMO-LIC-{index:04d}',
            'specialization': specialty,
            'years_of_experience': 2 + index % 15,
            'is_verified': index % 4 != 0,
            'phone': '+254700000000',
            'preferred_locations': ['Nairobi', 'Mombasa', 'Kisumu'],
            'availability_status': (
                'AVAILABLE' if index % 3 else 'BUSY'
            ),
        },
    )
    if created or not professional.has_usable_password():
        professional.set_password('TestPass123!')
        professional.save()
    professionals.append(professional)

doctors = [user for user in professionals if user.role == User.Role.DOCTOR]
nurses = [user for user in professionals if user.role == User.Role.NURSE]
specialists = [user for user in professionals if user.role == User.Role.SPECIALIST]

for index, demo_hospital in enumerate(demo_hospitals):
    departments = all_departments[demo_hospital.pk]
    demo_admin = hospital_admins[index]
    HospitalStaff.objects.get_or_create(
        user=demo_admin,
        hospital=demo_hospital,
        defaults={'role_at_hospital': 'ADMIN', 'is_primary': True},
    )
    for offset in range(3):
        professional = professionals[(index * 3 + offset) % len(professionals)]
        department = departments[
            'Intensive Care Unit' if professional.role == User.Role.NURSE
            else 'Emergency Department' if professional.role == User.Role.DOCTOR
            else 'General Medicine'
        ]
        HospitalStaff.objects.get_or_create(
            user=professional,
            hospital=demo_hospital,
            defaults={
                'department': department,
                'role_at_hospital': 'STAFF',
                'is_primary': index == 0,
            },
        )

# --- Shared resource catalog ---
category_specs = [
    ('equipment', 'Medical Equipment', True, 'items', 'equipment'),
    ('ppe', 'Personal Protective Equipment', True, 'kits', 'shield'),
]
categories = {
    'beds': beds_cat,
    'blood': blood_cat,
    'oxygen': oxygen_cat,
    'medications': meds_cat,
}
for slug, name, is_critical, unit_label, icon in category_specs:
    categories[slug], _ = ResourceCategory.objects.get_or_create(
        slug=slug,
        defaults={
            'name': name,
            'is_critical': is_critical,
            'unit_label': unit_label,
            'icon': icon,
        },
    )
categories['organs'], _ = ResourceCategory.objects.get_or_create(
    slug='organs',
    defaults={
        'name': 'Organs',
        'description': (
            'Aggregate transplant resource tracking only; availability must be '
            'entered from verified clinical data.'
        ),
        'is_critical': True,
        'unit_label': 'organs',
        'icon': 'heart-pulse',
    },
)

resource_type_specs = [
    ('beds', 'Emergency Observation Bed', 'BED-OBS', 'beds', 'Emergency Department'),
    ('equipment', 'Mechanical Ventilator', 'EQUIP-VENT', 'units', 'Intensive Care Unit'),
    ('equipment', 'Infusion Pump', 'EQUIP-PUMP', 'units', 'Intensive Care Unit'),
    ('ppe', 'PPE Kit', 'PPE-KIT', 'kits', 'Emergency Department'),
    ('medications', 'IV Fluid Pack', 'MED-IVF', 'packs', 'Emergency Department'),
    ('medications', 'Antibiotic Pack', 'MED-ABX', 'packs', 'General Medicine'),
    ('organs', 'Kidney', 'ORGAN-KIDNEY', 'organs', 'Surgery'),
    ('organs', 'Liver', 'ORGAN-LIVER', 'organs', 'Surgery'),
    ('organs', 'Heart', 'ORGAN-HEART', 'organs', 'Surgery'),
    ('organs', 'Lung', 'ORGAN-LUNG', 'organs', 'Surgery'),
]
resource_types = [
    (icu_bed, 'Intensive Care Unit'),
    (general_bed, 'General Medicine'),
]
for category_slug, name, code, unit, department_name in resource_type_specs:
    resource_type, _ = ResourceType.objects.get_or_create(
        category=categories[category_slug],
        name=name,
        defaults={
            'code': code,
            'description': f'Synthetic test stock: {name}.',
            'attributes': (
                {'availability_tracking': 'aggregate-only', 'clinical_verification_required': True}
                if category_slug == 'organs' else {}
            ),
        },
    )
    if category_slug != 'organs':
        resource_types.append((resource_type, department_name))

for hospital_index, demo_hospital in enumerate(demo_hospitals):
    departments = all_departments[demo_hospital.pk]
    hospital_admin_for_stock = hospital_admins[hospital_index]

    for resource_index, (resource_type, department_name) in enumerate(resource_types):
        capacity = 40 + (hospital_index % 10) * 5 + resource_index * 3
        available = max(1, capacity - ((hospital_index + resource_index * 7) % 25))
        stock, _ = HospitalResource.objects.get_or_create(
            hospital=demo_hospital,
            resource_type=resource_type,
            department=departments[department_name],
            defaults={
                'total_capacity': capacity,
                'available_quantity': available,
                'low_stock_threshold': max(3, capacity // 10),
                'unit': resource_type.category.unit_label,
                'updated_by': hospital_admin_for_stock,
                'notes': 'Synthetic development/test inventory.',
            },
        )
        ResourceTransaction.objects.get_or_create(
            hospital_resource=stock,
            reference=f'DEMO-SEED-{demo_hospital.registration_number}-{resource_type.code}',
            defaults={
                'transaction_type': 'ADJUST',
                'quantity': 0,
                'previous_available': stock.available_quantity,
                'new_available': stock.available_quantity,
                'performed_by': hospital_admin_for_stock,
                'reason': 'Initial synthetic demo inventory.',
            },
        )

    for group_index, blood_group in enumerate(
        ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    ):
        batch_group = blood_group.replace('+', 'P').replace('-', 'N')
        BloodStock.objects.get_or_create(
            hospital=demo_hospital,
            blood_group=blood_group,
            component='WHOLE',
            batch_number=f'DEMO-{demo_hospital.registration_number}-{batch_group}',
            defaults={
                'units_available': 4 if group_index == hospital_index % 8 else 12 + group_index,
                'expiry_date': date.today() + timedelta(days=90 + group_index),
                'low_stock_threshold': 5,
                'updated_by': hospital_admin_for_stock,
            },
        )

    for supply_index, supply_type in enumerate(
        ['CYLINDER', 'LIQUID', 'CONCENTRATOR', 'PIPELINE']
    ):
        capacity_litres = Decimal('50000') if supply_type == 'PIPELINE' else Decimal('4000')
        OxygenSupply.objects.get_or_create(
            hospital=demo_hospital,
            supply_type=supply_type,
            defaults={
                'capacity_litres': capacity_litres,
                'current_level_litres': capacity_litres * Decimal('0.65'),
                'number_of_units': 10 + supply_index * 5,
                'available_units': 6 + supply_index * 3,
                'updated_by': hospital_admin_for_stock,
                'location': 'Central medical stores',
                'notes': 'Synthetic development/test supply.',
            },
        )

# --- Contracts, bids, and assignments ---
created_contracts = []
now = timezone.now()
for index, demo_hospital in enumerate(demo_hospitals[1:], start=1):
    department_map = all_departments[demo_hospital.pk]
    demo_admin = hospital_admins[index]
    contract_specs = [
        (
            'Emergency Physician Cover',
            'DOCTOR',
            'Emergency Medicine',
            'Emergency Department',
            index % 4 == 0,
        ),
        (
            'Critical Care Nurse Shift',
            'NURSE',
            'Critical Care',
            'Intensive Care Unit',
            index % 5 == 0,
        ),
    ]

    for contract_index, (title, role, specialty, department_name, should_fill) in enumerate(contract_specs):
        start = now + timedelta(days=2 + (index + contract_index) % 28, hours=8)
        contract_title = f'{title} - {demo_hospital.registration_number}'
        contract, _ = WorkContract.objects.get_or_create(
            hospital=demo_hospital,
            title=contract_title,
            defaults={
                'department': department_map[department_name],
                'created_by': demo_admin,
                'description': (
                    f'Synthetic {specialty} cover opportunity for '
                    f'{demo_hospital.name}; created for development testing.'
                ),
                'contract_type': 'SHIFT',
                'required_role': role,
                'specialization_required': specialty,
                'min_years_experience': 2,
                'start_datetime': start,
                'end_datetime': start + timedelta(hours=12),
                'budget_min': Decimal('12000'),
                'budget_max': Decimal('22000'),
                'currency': 'KES',
                'payment_type': 'SHIFT',
                'urgency': 'HIGH' if index % 3 == 0 else 'NORMAL',
                'status': 'FILLED' if should_fill else 'OPEN',
                'published_at': now,
                'filled_by': (
                    (doctors if role == 'DOCTOR' else nurses)[index % len(doctors if role == 'DOCTOR' else nurses)]
                    if should_fill else None
                ),
                'requirements': [
                    f'Valid {specialty} registration',
                    'Availability confirmed',
                ],
            },
        )
        created_contracts.append((contract, demo_admin, role, should_fill))

for contract_index, (contract, demo_admin, role, should_fill) in enumerate(created_contracts):
    candidates = doctors if role == 'DOCTOR' else nurses
    if not candidates:
        candidates = specialists
    bidder_count = 1 if should_fill else min(2, len(candidates))
    for bidder_index in range(bidder_count):
        bidder = candidates[(contract_index + bidder_index) % len(candidates)]
        accepted = should_fill and bidder_index == 0
        bid, _ = Bid.objects.get_or_create(
            contract=contract,
            bidder=bidder,
            defaults={
                'proposed_rate': Decimal('18000') + Decimal(bidder_index * 1000),
                'currency': 'KES',
                'message': 'Synthetic demo application for testing the staffing workflow.',
                'availability_confirmed': True,
                'status': 'ACCEPTED' if accepted else 'PENDING',
                'reviewed_by': demo_admin if accepted else None,
                'reviewed_at': now if accepted else None,
            },
        )
        if accepted:
            ContractAssignment.objects.get_or_create(
                contract=contract,
                defaults={
                    'professional': bidder,
                    'accepted_bid': bid,
                    'agreed_rate': bid.proposed_rate,
                    'currency': bid.currency,
                    'start_datetime': contract.start_datetime,
                    'end_datetime': contract.end_datetime,
                    'status': 'SCHEDULED',
                    'notes': 'Synthetic assignment for workflow testing.',
                },
            )

eligible_doctors = doctors or [doctor]
for bidder_index, bidder in enumerate(eligible_doctors[:2]):
    Bid.objects.get_or_create(
        contract=sample_contract,
        bidder=bidder,
        defaults={
            'proposed_rate': Decimal('19000') + Decimal(bidder_index * 1000),
            'currency': 'KES',
            'message': 'Synthetic demo application for the sample Nairobi contract.',
            'availability_confirmed': True,
            'status': 'PENDING',
        },
    )

# --- Notification preferences and in-app sample notifications ---
all_seed_users = list({
    user.pk: user
    for user in [admin, hospital_admin, doctor, nurse, *hospital_admins, *professionals]
}.values())
for user in all_seed_users:
    NotificationPreference.objects.get_or_create(user=user)
    notification_type = (
        'CONTRACT_NEW' if user.role in {
            User.Role.DOCTOR, User.Role.NURSE, User.Role.SPECIALIST
        } else 'SYSTEM'
    )
    Notification.objects.get_or_create(
        recipient=user,
        notification_type=notification_type,
        title='Demo data is ready',
        defaults={
            'message': 'Synthetic development data is available in the platform.',
            'data': {'demo': True},
        },
    )
    if user.role == User.Role.HOSPITAL_ADMIN:
        Notification.objects.get_or_create(
            recipient=user,
            notification_type='RESOURCE_LOW',
            title='Demo inventory alert',
            defaults={
                'message': 'This sample alert is for testing resource notifications.',
                'data': {'demo': True},
            },
        )

print("\nSeed complete.")
print("Login credentials:")
print("  Platform Admin : admin@platform.local / AdminPass123!")
print("  Hospital Admin : admin@nairobi-general.local / HospitalPass123!")
print("  Doctor         : dr.kamau@example.com / DoctorPass123!")
print("  Nurse          : nurse.wani@example.com / NursePass123!")
print("  Additional demo accounts use the password: TestPass123!")
print(
    "Counts: hospitals={}, departments={}, staff={}, resources={}, "
    "blood_stocks={}, oxygen_supplies={}, contracts={}, bids={}, "
    "assignments={}, notifications={}".format(
        Hospital.objects.count(),
        Department.objects.count(),
        HospitalStaff.objects.count(),
        HospitalResource.objects.count(),
        BloodStock.objects.count(),
        OxygenSupply.objects.count(),
        WorkContract.objects.count(),
        Bid.objects.count(),
        ContractAssignment.objects.count(),
        Notification.objects.count(),
    )
)
