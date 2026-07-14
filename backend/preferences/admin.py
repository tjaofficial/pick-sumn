from django.contrib import admin

from .models import (
    Cuisine,
    DietaryTag,
    DiningStyle,
    FoodDislike,
    UserCuisinePreference,
    UserDietaryPreference,
    UserDiningStylePreference,
    UserFoodDislike,
)


@admin.register(Cuisine)
class CuisineAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    list_filter = ("is_active",)


@admin.register(DiningStyle)
class DiningStyleAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    list_filter = ("is_active",)


@admin.register(DietaryTag)
class DietaryTagAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    list_filter = ("is_active",)


@admin.register(FoodDislike)
class FoodDislikeAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    list_filter = ("is_active",)


@admin.register(UserCuisinePreference)
class UserCuisinePreferenceAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "cuisine",
        "level",
        "rank",
    )

    search_fields = (
        "user__email",
        "user__display_name",
        "cuisine__name",
    )

    list_filter = (
        "level",
        "cuisine",
    )


@admin.register(UserDiningStylePreference)
class UserDiningStylePreferenceAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "dining_style",
        "level",
    )

    list_filter = (
        "level",
        "dining_style",
    )


@admin.register(UserDietaryPreference)
class UserDietaryPreferenceAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "dietary_tag",
        "is_required",
    )

    list_filter = (
        "is_required",
        "dietary_tag",
    )


@admin.register(UserFoodDislike)
class UserFoodDislikeAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "food_dislike",
        "is_absolute",
    )

    list_filter = (
        "is_absolute",
        "food_dislike",
    )