import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type HealthResponse = {
  status: string;
  message: string;
};

const API_URL = "http://127.0.0.1:8000/api/health/";

export default function PickScreen() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function checkBackend() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(
          `Backend returned status ${response.status}`,
        );
      }

      const result: HealthResponse = await response.json();

      setData(result);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "An unknown error occurred.";

      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkBackend();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Image
          source={require("../../../assets/images/pick-sumn-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.tagline}>
          Stop Arguing. Start Eating.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Backend Connection
          </Text>

          {loading && (
            <ActivityIndicator
              size="large"
              color="#F3344A"
            />
          )}

          {!loading && data && (
            <>
              <Text style={styles.success}>
                Connected successfully
              </Text>

              <Text style={styles.message}>
                {data.message}
              </Text>
            </>
          )}

          {!loading && error && (
            <>
              <Text style={styles.error}>
                Connection failed
              </Text>

              <Text style={styles.message}>
                {error}
              </Text>
            </>
          )}

          <Pressable
            style={styles.button}
            onPress={checkBackend}
          >
            <Text style={styles.buttonText}>
              Test Again
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF9F2",
  },

  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },

  logo: {
    width: 270,
    height: 190,
    alignSelf: "center",
  },

  tagline: {
    marginBottom: 30,
    fontSize: 18,
    fontWeight: "700",
    color: "#07111F",
    textAlign: "center",
  },

  card: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  cardTitle: {
    marginBottom: 20,
    fontSize: 22,
    fontWeight: "800",
    color: "#07111F",
    textAlign: "center",
  },

  success: {
    color: "#138A48",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  error: {
    color: "#C62828",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  message: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 16,
    color: "#606773",
    textAlign: "center",
  },

  button: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#F3344A",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
});