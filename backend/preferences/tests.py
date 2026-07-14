from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from .models import (
    Cuisine,
    DietaryTag,
    DiningStyle,
    FoodDislike,
)


class SeedPreferencesCommandTests(TestCase):
    def test_seed_command_creates_preference_data(self):
        output = StringIO()

        call_command(
            "seed_preferences",
            stdout=output,
        )

        self.assertGreater(
            Cuisine.objects.count(),
            0,
        )

        self.assertGreater(
            DiningStyle.objects.count(),
            0,
        )

        self.assertGreater(
            DietaryTag.objects.count(),
            0,
        )

        self.assertGreater(
            FoodDislike.objects.count(),
            0,
        )

        self.assertIn(
            "Preference data seeded successfully",
            output.getvalue(),
        )

    def test_seed_command_does_not_create_duplicates(self):
        call_command("seed_preferences")

        first_cuisine_count = Cuisine.objects.count()
        first_style_count = DiningStyle.objects.count()
        first_dietary_count = DietaryTag.objects.count()
        first_dislike_count = FoodDislike.objects.count()

        call_command("seed_preferences")

        self.assertEqual(
            Cuisine.objects.count(),
            first_cuisine_count,
        )

        self.assertEqual(
            DiningStyle.objects.count(),
            first_style_count,
        )

        self.assertEqual(
            DietaryTag.objects.count(),
            first_dietary_count,
        )

        self.assertEqual(
            FoodDislike.objects.count(),
            first_dislike_count,
        )