from django.db import migrations


def create_organs_catalog(apps, schema_editor):
    ResourceCategory = apps.get_model('resources', 'ResourceCategory')
    ResourceType = apps.get_model('resources', 'ResourceType')
    category, _ = ResourceCategory.objects.get_or_create(
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
    for name, code in (
        ('Kidney', 'ORGAN-KIDNEY'),
        ('Liver', 'ORGAN-LIVER'),
        ('Heart', 'ORGAN-HEART'),
        ('Lung', 'ORGAN-LUNG'),
    ):
        ResourceType.objects.get_or_create(
            category=category,
            name=name,
            defaults={
                'code': code,
                'description': f'{name} transplant resource tracking.',
                'attributes': {
                    'availability_tracking': 'aggregate-only',
                    'clinical_verification_required': True,
                },
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ('resources', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_organs_catalog, migrations.RunPython.noop),
    ]
