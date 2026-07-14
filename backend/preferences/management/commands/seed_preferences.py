from django.core.management.base import BaseCommand
from django.utils.text import slugify

from preferences.models import (
    Cuisine,
    DietaryTag,
    DiningStyle,
    FoodDislike,
)


CUISINES = [
    "African",
    "American",
    "Barbecue",
    "Caribbean",
    "Chinese",
    "French",
    "Greek",
    "Indian",
    "Italian",
    "Japanese",
    "Korean",
    "Mediterranean",
    "Mexican",
    "Middle Eastern",
    "Seafood",
    "Soul Food",
    "Southern",
    "Spanish",
    "Thai",
    "Vietnamese",
]

DINING_STYLES = [
    "Buffet",
    "Casual Dining",
    "Carryout",
    "Delivery",
    "Dine-In",
    "Drive-Through",
    "Fast Casual",
    "Fast Food",
    "Fine Dining",
    "Food Truck",
    "Local Restaurant",
    "Outdoor Dining",
]

DIETARY_TAGS = [
    {
        "name": "Dairy-Free",
        "description": "Offers options without dairy ingredients.",
    },
    {
        "name": "Gluten-Free",
        "description": "Offers gluten-free meal options.",
    },
    {
        "name": "Halal",
        "description": "Offers food prepared according to halal guidelines.",
    },
    {
        "name": "Kosher",
        "description": "Offers food prepared according to kosher guidelines.",
    },
    {
        "name": "Low-Carb",
        "description": "Offers lower-carbohydrate meal options.",
    },
    {
        "name": "Nut-Free",
        "description": "Offers options prepared without nuts.",
    },
    {
        "name": "Pescatarian",
        "description": "Offers meals suitable for pescatarian diets.",
    },
    {
        "name": "Vegan",
        "description": "Offers meals without animal-derived ingredients.",
    },
    {
        "name": "Vegetarian",
        "description": "Offers meat-free meal options.",
    },
]

FOOD_DISLIKES = [
    "Anchovies",
    "Beans",
    "Blue Cheese",
    "Cilantro",
    "Eggs",
    "Fish",
    "Garlic",
    "Mayo",
    "Mushrooms",
    "Olives",
    "Onions",
    "Pickles",
    "Pork",
    "Seafood",
    "Shellfish",
    "Spicy Food",
    "Tomatoes",
]


class Command(BaseCommand):
    help = "Create or update the standard Pick Sum'N preference data."

    def handle(self, *args, **options):
        cuisine_count = self.seed_named_models(
            model=Cuisine,
            values=CUISINES,
        )

        dining_style_count = self.seed_named_models(
            model=DiningStyle,
            values=DINING_STYLES,
        )

        dislike_count = self.seed_named_models(
            model=FoodDislike,
            values=FOOD_DISLIKES,
        )

        dietary_count = 0

        for item in DIETARY_TAGS:
            _, created = DietaryTag.objects.update_or_create(
                slug=slugify(item["name"]),
                defaults={
                    "name": item["name"],
                    "description": item["description"],
                    "is_active": True,
                },
            )

            if created:
                dietary_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Preference data seeded successfully."
            )
        )

        self.stdout.write(
            (
                f"Created {cuisine_count} cuisines, "
                f"{dining_style_count} dining styles, "
                f"{dietary_count} dietary tags, and "
                f"{dislike_count} food dislikes."
            )
        )

    @staticmethod
    def seed_named_models(model, values):
        created_count = 0

        for name in values:
            _, created = model.objects.update_or_create(
                slug=slugify(name),
                defaults={
                    "name": name,
                    "is_active": True,
                },
            )

            if created:
                created_count += 1

        return created_count