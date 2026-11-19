from django.test import TestCase

from .models import ResourceCategory


class OrganResourceCatalogTests(TestCase):
    def test_organs_category_and_types_are_available_after_migration(self):
        category = ResourceCategory.objects.get(slug='organs')

        self.assertEqual(category.name, 'Organs')
        self.assertEqual(
            set(category.types.values_list('name', flat=True)),
            {'Kidney', 'Liver', 'Heart', 'Lung'},
        )
