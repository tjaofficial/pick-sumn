import {
  router,
} from "expo-router";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  ArrowLeft,
  Check,
  Crown,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";
import {
  getAvailablePurchases,
  type Purchase,
  useIAP,
} from "expo-iap";

import {
  usePlus,
} from "@/features/plus/PlusContext";
import {
  APPLE_PLUS_ANNUAL_PRODUCT_ID,
  APPLE_PLUS_MONTHLY_PRODUCT_ID,
  APPLE_PLUS_PRODUCT_IDS,
  getAppleAppAccountToken,
  verifyAppleSubscriptionPurchase,
} from "@/features/plus/subscriptionService";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";
import {
  useTheme,
} from "@/hooks/use-theme";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";


function isPickSumnPlusPurchase(
  purchase: Purchase,
): boolean {
  return (
    purchase.productId
    === APPLE_PLUS_MONTHLY_PRODUCT_ID
    || purchase.productId
    === APPLE_PLUS_ANNUAL_PRODUCT_ID
  );
}


export default function PlusPaymentScreen() {
  useAppTheme();

  const colors = useTheme();

  const {
    isPlus,
    refreshEntitlements,
  } = usePlus();

  const [
    pendingProductId,
    setPendingProductId,
  ] = useState<string | null>(
    null,
  );

  const [
    isRestoring,
    setIsRestoring,
  ] = useState(false);

  const [
    purchaseMessage,
    setPurchaseMessage,
  ] = useState<string | null>(
    null,
  );

  const {
    connected,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess:
      async (purchase) => {
        if (
          Platform.OS !== "ios"
          || !isPickSumnPlusPurchase(
            purchase,
          )
        ) {
          return;
        }

        try {
          setPurchaseMessage(
            "Verifying your subscription...",
          );

          const result =
            await verifyAppleSubscriptionPurchase(
              {
                transaction_id:
                  purchase.id,
                product_id:
                  purchase.productId,
              },
            );

          await finishTransaction({
            purchase,
            isConsumable: false,
          });

          await refreshEntitlements();

          setPurchaseMessage(null);
          setPendingProductId(null);

          Alert.alert(
            "Pick Sum’N Plus is active",
            result.detail
              || (
                "Your Plus features "
                + "are ready to use."
              ),
            [
              {
                text: "Start Picking",
                onPress: () =>
                  router.replace(
                    "/settings/plus",
                  ),
              },
            ],
          );
        } catch (requestError) {
          setPurchaseMessage(null);
          setPendingProductId(null);

          Alert.alert(
            "Purchase verification issue",
            getApiErrorMessage(
              requestError,
              (
                "Apple completed the purchase, "
                + "but Pick Sum’N could not verify "
                + "it yet. Use Restore Purchases "
                + "once your connection is stable."
              ),
            ),
          );
        }
      },

    onPurchaseError:
      (purchaseError) => {
        setPurchaseMessage(null);
        setPendingProductId(null);

        const message =
          String(
            purchaseError?.message
            || "",
          ).trim();

        const code =
          String(
            purchaseError?.code
            || "",
          ).toLowerCase();

        if (
          code.includes(
            "user-cancelled",
          )
          || code.includes(
            "user_cancelled",
          )
        ) {
          return;
        }

        Alert.alert(
          "Purchase not completed",
          message
            || (
              "The App Store could not "
              + "complete this purchase."
            ),
        );
      },
  });


  useEffect(() => {
    if (
      Platform.OS !== "ios"
      || !connected
    ) {
      return;
    }

    void fetchProducts({
      skus: [
        ...APPLE_PLUS_PRODUCT_IDS,
      ],
      type: "subs",
    });
  }, [
    connected,
    fetchProducts,
  ]);


  const monthlyProduct =
    useMemo(
      () =>
        subscriptions.find(
          (product) =>
            product.id
            === APPLE_PLUS_MONTHLY_PRODUCT_ID,
        ),
      [subscriptions],
    );

  const annualProduct =
    useMemo(
      () =>
        subscriptions.find(
          (product) =>
            product.id
            === APPLE_PLUS_ANNUAL_PRODUCT_ID,
        ),
      [subscriptions],
    );

  const monthlyPrice =
    monthlyProduct?.displayPrice
    || "$4.99";

  const annualPrice =
    annualProduct?.displayPrice
    || "$39.99";

  const storeReady =
    Platform.OS === "ios"
    && connected
    && Boolean(monthlyProduct)
    && Boolean(annualProduct);


  async function buySubscription(
    productId: string,
  ) {
    if (Platform.OS !== "ios") {
      Alert.alert(
        "Google Play setup is next",
        (
          "Apple subscriptions are being "
          + "connected first. Google Play "
          + "billing will use this same "
          + "Plus entitlement system."
        ),
      );
      return;
    }

    if (!connected) {
      Alert.alert(
        "App Store unavailable",
        (
          "The App Store connection is "
          + "still loading. Try again "
          + "in a moment."
        ),
      );
      return;
    }

    try {
      setPendingProductId(
        productId,
      );
      setPurchaseMessage(
        "Opening the App Store...",
      );

      const {
        app_account_token,
      } =
        await getAppleAppAccountToken();

      await requestPurchase({
        request: {
          apple: {
            sku: productId,
            appAccountToken:
              app_account_token,
          },
        },
        type: "subs",
      });
    } catch (requestError) {
      setPurchaseMessage(null);
      setPendingProductId(null);

      Alert.alert(
        "Unable to start purchase",
        getApiErrorMessage(
          requestError,
          (
            "The App Store purchase "
            + "could not be started."
          ),
        ),
      );
    }
  }


  async function manageSubscription() {
    if (Platform.OS !== "ios") {
      Alert.alert(
        "Subscription management",
        (
          "Google Play subscription management "
          + "will be added with Android billing."
        ),
      );
      return;
    }

    try {
      const url =
        "https://apps.apple.com/account/subscriptions";

      const supported =
        await Linking.canOpenURL(
          url,
        );

      if (!supported) {
        throw new Error(
          "Subscription settings are unavailable.",
        );
      }

      await Linking.openURL(
        url,
      );
    } catch {
      Alert.alert(
        "Unable to open subscriptions",
        (
          "Open the App Store, tap your profile, "
          + "then choose Subscriptions to manage "
          + "Pick Sum’N Plus."
        ),
      );
    }
  }


  async function restorePurchases() {
    if (Platform.OS !== "ios") {
      Alert.alert(
        "Google Play setup is next",
        (
          "Restore Purchases will support "
          + "Google Play after the Android "
          + "subscription products are created."
        ),
      );
      return;
    }

    try {
      setIsRestoring(true);

      const purchases =
        await getAvailablePurchases({
          onlyIncludeActiveItemsIOS:
            true,
        });

      const plusPurchases =
        purchases.filter(
          isPickSumnPlusPurchase,
        );

      if (
        plusPurchases.length
        === 0
      ) {
        Alert.alert(
          "Nothing to restore",
          (
            "No active Pick Sum’N Plus "
            + "subscription was found for "
            + "this Apple ID."
          ),
        );
        return;
      }

      let restored = false;

      for (
        const purchase
        of plusPurchases
      ) {
        try {
          await verifyAppleSubscriptionPurchase(
            {
              transaction_id:
                purchase.id,
              product_id:
                purchase.productId,
            },
          );

          await finishTransaction({
            purchase,
            isConsumable: false,
          });

          restored = true;
        } catch {
          /*
           * Keep trying the remaining active
           * purchases. Only one valid Plus
           * entitlement is needed.
           */
        }
      }

      if (!restored) {
        throw new Error(
          (
            "An Apple subscription was found, "
            + "but it belongs to a different "
            + "Pick Sum’N account or could "
            + "not be verified."
          ),
        );
      }

      await refreshEntitlements();

      Alert.alert(
        "Purchases restored",
        (
          "Your Pick Sum’N Plus "
          + "subscription is active."
        ),
      );
    } catch (requestError) {
      Alert.alert(
        "Unable to restore purchases",
        getApiErrorMessage(
          requestError,
          (
            "Pick Sum’N could not restore "
            + "your App Store purchases."
          ),
        ),
      );
    } finally {
      setIsRestoring(false);
    }
  }


  return (
    <SafeAreaView
      style={[
        styles.screen,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <View
        style={[
          styles.topBar,
          {
            borderBottomColor:
              colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() =>
            router.back()
          }
          style={styles.backButton}
        >
          <ArrowLeft
            size={23}
            color={colors.text}
          />
        </Pressable>

        <Text
          style={[
            styles.topTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Upgrade to Plus
        </Text>

        <View
          style={styles.spacer}
        />
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.hero}>
          <View
            style={styles.crownCircle}
          >
            <Crown
              size={38}
              color={themeColor("#C67A00", "color")}
            />
          </View>

          <Text
            style={styles.heroTitle}
          >
            Pick Sum’N Plus
          </Text>

          <Text
            style={styles.heroText}
          >
            Bigger groups. Smarter filters.
            More ways to find the right place.
          </Text>
        </View>

        {isPlus && (
          <>
            <View
              style={styles.activeCard}
            >
              <ShieldCheck
                size={23}
                color={themeColor("#168B4F", "color")}
              />

              <View style={{ flex: 1 }}>
                <Text
                  style={styles.activeTitle}
                >
                  Plus is active
                </Text>

                <Text
                  style={styles.activeText}
                >
                  Your premium features are
                  already unlocked.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() =>
                void manageSubscription()
              }
              style={styles.manageButton}
            >
              <ExternalLink
                size={18}
                color={themeColor("#07111F", "color")}
              />

              <Text
                style={styles.manageButtonText}
              >
                Manage Subscription
              </Text>
            </Pressable>
          </>
        )}

        <View
          style={[
            styles.planCard,
            styles.monthlyCard,
            {
              backgroundColor:
                colors.surface,
            },
          ]}
        >
          <View
            style={styles.planHeadingRow}
          >
            <View>
              <Text
                style={[
                  styles.planTitle,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                Monthly
              </Text>

              <Text
                style={styles.trialText}
              >
                3-day introductory offer for eligible new subscribers
              </Text>
            </View>

            <Sparkles
              size={22}
              color={themeColor("#F3344A", "color")}
            />
          </View>

          <View
            style={styles.priceRow}
          >
            <Text
              style={[
                styles.price,
                {
                  color: colors.text,
                },
              ]}
            >
              {monthlyPrice}
            </Text>

            <Text
              style={styles.pricePeriod}
            >
              / month
            </Text>
          </View>

          <Text
            style={styles.planDescription}
          >
            Eligible new subscribers may receive
            a 3-day free introductory trial.
            Apple confirms your eligibility,
            exact price, and offer before purchase.
          </Text>

          <Pressable
            disabled={
              pendingProductId !== null
              || !storeReady
              || isPlus
            }
            onPress={() =>
              void buySubscription(
                APPLE_PLUS_MONTHLY_PRODUCT_ID,
              )
            }
            style={[
              styles.purchaseButton,
              (
                pendingProductId !== null
                || !storeReady
                || isPlus
              )
              && styles.disabledButton,
            ]}
          >
            {pendingProductId
            === APPLE_PLUS_MONTHLY_PRODUCT_ID
              ? (
                  <ActivityIndicator
                    size="small"
                    color={themeColor("#FFFFFF", "color")}
                  />
                )
              : (
                  <ShieldCheck
                    size={20}
                    color={themeColor("#FFFFFF", "color")}
                  />
                )}

            <Text
              style={
                styles.purchaseText
              }
            >
              {`Continue — ${monthlyPrice}/month`}
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.planCard,
            styles.annualCard,
            {
              backgroundColor:
                colors.surface,
            },
          ]}
        >
          <View
            style={styles.bestValueBadge}
          >
            <Text
              style={
                styles.bestValueText
              }
            >
              BEST VALUE
            </Text>
          </View>

          <Text
            style={[
              styles.planTitle,
              {
                color: colors.text,
              },
            ]}
          >
            Annual
          </Text>

          <View
            style={styles.priceRow}
          >
            <Text
              style={[
                styles.price,
                {
                  color: colors.text,
                },
              ]}
            >
              {annualPrice}
            </Text>

            <Text
              style={styles.pricePeriod}
            >
              / year
            </Text>
          </View>

          <Text
            style={styles.savingsText}
          >
            About $3.33/month at the
            U.S. $39.99 annual price.
          </Text>

          <Pressable
            disabled={
              pendingProductId !== null
              || !storeReady
              || isPlus
            }
            onPress={() =>
              void buySubscription(
                APPLE_PLUS_ANNUAL_PRODUCT_ID,
              )
            }
            style={[
              styles.annualButton,
              (
                pendingProductId !== null
                || !storeReady
                || isPlus
              )
              && styles.disabledButton,
            ]}
          >
            {pendingProductId
            === APPLE_PLUS_ANNUAL_PRODUCT_ID
              ? (
                  <ActivityIndicator
                    size="small"
                    color={themeColor("#FFFFFF", "color")}
                  />
                )
              : (
                  <Crown
                    size={20}
                    color={themeColor("#FFFFFF", "color")}
                  />
                )}

            <Text
              style={
                styles.purchaseText
              }
            >
              Get Annual Plus
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.benefitsCard,
            {
              backgroundColor:
                colors.surface,
              borderColor:
                colors.border,
            },
          ]}
        >
          {[
            "Larger groups and sessions",
            "Search radius up to 50 miles",
            "Dining Style and Price Range filters",
            "Unlimited saved restaurants",
            "Enhanced dietary insights",
          ].map((item) => (
            <View
              key={item}
              style={styles.benefitRow}
            >
              <Check
                size={18}
                color={themeColor("#168B4F", "color")}
                strokeWidth={3}
              />

              <Text
                style={[
                  styles.benefitText,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>

        {!!purchaseMessage && (
          <View
            style={styles.processingRow}
          >
            <ActivityIndicator
              size="small"
              color={themeColor("#F3344A", "color")}
            />

            <Text
              style={styles.processingText}
            >
              {purchaseMessage}
            </Text>
          </View>
        )}

        <Pressable
          onPress={() =>
            void restorePurchases()
          }
          disabled={
            isRestoring
            || Platform.OS !== "ios"
          }
          style={styles.restoreButton}
        >
          {isRestoring ? (
            <ActivityIndicator
              size="small"
              color={themeColor("#69707C", "color")}
            />
          ) : (
            <RefreshCw
              size={17}
              color={themeColor("#69707C", "color")}
            />
          )}

          <Text
            style={styles.restoreText}
          >
            Restore Purchases
          </Text>
        </Pressable>

        {!storeReady
        && Platform.OS === "ios" && (
          <Text
            style={styles.storeStatus}
          >
            Connecting to the App Store…
          </Text>
        )}

        {Platform.OS !== "ios" && (
          <Text
            style={styles.storeStatus}
          >
            Google Play subscriptions will
            be connected after the Android
            Play Store setup is complete.
          </Text>
        )}

        <Text
          style={styles.disclosure}
        >
          Payment is charged to your Apple ID.
          Monthly subscriptions renew at the
          App Store price shown above after any
          introductory offer Apple confirms you
          are eligible to receive. Annual
          subscriptions renew yearly. You can
          cancel in your App Store subscription
          settings. Apple confirms the exact
          price and offer before purchase.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles =
  createThemedStyleSheet({
    screen: {
      flex: 1,
      backgroundColor: "#FFF9F2",
    },

    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: "#ECEDEF",
    },

    backButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: "#FFFFFF",
    },

    topTitle: {
      fontSize: 18,
      fontWeight: "900",
      color: "#07111F",
    },

    spacer: {
      width: 42,
    },

    content: {
      padding: 20,
      paddingBottom: 50,
    },

    hero: {
      alignItems: "center",
      padding: 24,
      borderRadius: 25,
      backgroundColor: "#FFF4DC",
    },

    crownCircle: {
      width: 68,
      height: 68,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 22,
      backgroundColor: "#FFFFFF",
    },

    heroTitle: {
      marginTop: 11,
      fontSize: 27,
      fontWeight: "900",
      color: "#07111F",
    },

    heroText: {
      maxWidth: 330,
      marginTop: 7,
      fontSize: 13,
      lineHeight: 19,
      color: "#69707C",
      textAlign: "center",
    },

    activeCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      marginTop: 16,
      padding: 15,
      borderWidth: 1,
      borderColor: "#B8E1C9",
      borderRadius: 18,
      backgroundColor: "#EFFAF3",
    },

    activeTitle: {
      fontSize: 14,
      fontWeight: "900",
      color: "#116A3D",
    },

    activeText: {
      marginTop: 3,
      fontSize: 11,
      lineHeight: 16,
      color: "#3B7656",
    },

    manageButton: {
      minHeight: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 10,
      borderWidth: 1,
      borderColor: "#D9DDE3",
      borderRadius: 16,
      backgroundColor: "#FFFFFF",
    },

    manageButtonText: {
      fontSize: 13,
      fontWeight: "900",
      color: "#07111F",
    },

    planCard: {
      position: "relative",
      marginTop: 17,
      padding: 19,
      borderWidth: 1,
      borderRadius: 22,
      backgroundColor: "#FFFFFF",
    },

    monthlyCard: {
      borderColor: "#F4BCC3",
    },

    annualCard: {
      paddingTop: 26,
      borderColor: "#E5C57A",
    },

    planHeadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    planTitle: {
      fontSize: 19,
      fontWeight: "900",
      color: "#07111F",
    },

    trialText: {
      marginTop: 3,
      fontSize: 12,
      fontWeight: "900",
      color: "#F3344A",
    },

    priceRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      marginTop: 12,
    },

    price: {
      fontSize: 31,
      fontWeight: "900",
      color: "#07111F",
    },

    pricePeriod: {
      marginLeft: 5,
      marginBottom: 5,
      fontSize: 12,
      fontWeight: "700",
      color: "#69707C",
    },

    planDescription: {
      marginTop: 8,
      fontSize: 11,
      lineHeight: 17,
      color: "#69707C",
    },

    savingsText: {
      marginTop: 7,
      fontSize: 11,
      fontWeight: "800",
      color: "#8A6716",
    },

    bestValueBadge: {
      position: "absolute",
      top: -11,
      right: 17,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: "#07111F",
    },

    bestValueText: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.8,
      color: "#FFD158",
    },

    purchaseButton: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 18,
      borderRadius: 17,
      backgroundColor: "#F3344A",
    },

    annualButton: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 18,
      borderRadius: 17,
      backgroundColor: "#07111F",
    },

    disabledButton: {
      opacity: 0.45,
    },

    purchaseText: {
      fontSize: 15,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    benefitsCard: {
      marginTop: 17,
      padding: 16,
      borderWidth: 1,
      borderColor: "#ECEDEF",
      borderRadius: 19,
      backgroundColor: "#FFFFFF",
    },

    benefitRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginVertical: 5,
    },

    benefitText: {
      flex: 1,
      fontSize: 12,
      fontWeight: "700",
      color: "#07111F",
    },

    processingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 15,
    },

    processingText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#69707C",
    },

    restoreButton: {
      minHeight: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      marginTop: 10,
    },

    restoreText: {
      fontSize: 13,
      fontWeight: "900",
      color: "#69707C",
    },

    storeStatus: {
      marginTop: 3,
      fontSize: 10,
      lineHeight: 15,
      color: "#7A808A",
      textAlign: "center",
    },

    disclosure: {
      marginTop: 9,
      fontSize: 10,
      lineHeight: 15,
      color: "#7A808A",
      textAlign: "center",
    },
  });
