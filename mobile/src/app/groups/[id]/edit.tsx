import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  ArrowLeft,
  Check,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useEffect,
  useState,
} from "react";

import {
  KeyboardAwareScrollView,
} from "@/components/KeyboardAwareScrollView";
import {
  getGroup,
  updateGroup,
} from "@/features/groups/groupsService";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";


export default function EditGroupScreen() {
  const params =
    useLocalSearchParams<{
      id?: string | string[];
    }>();

  const groupId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [isLoading, setIsLoading] =
    useState(true);
  const [isSaving, setIsSaving] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);


  useEffect(() => {
    async function loadGroup() {
      if (!groupId) {
        setError("The group ID is missing.");
        setIsLoading(false);
        return;
      }

      try {
        const group = await getGroup(groupId);

        setName(group.name);
        setDescription(
          group.description || "",
        );
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load this group.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadGroup();
  }, [groupId]);


  async function handleSave() {
    const currentGroupId = groupId;
    const trimmedName = name.trim();

    if (!currentGroupId) {
      return;
    }

    if (!trimmedName) {
      setError("Enter a group name.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await updateGroup(
        currentGroupId,
        {
          name: trimmedName,
          description:
            description.trim(),
        },
      );

      router.replace({
        pathname: "/groups/[id]",
        params: {
          id: currentGroupId,
        },
      });
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to update the group.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }


  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color="#F3344A"
          />
          <Text style={styles.loadingText}>
            Loading group...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.topBarButton}
        >
          <ArrowLeft
            size={23}
            color="#07111F"
          />
        </Pressable>

        <Text style={styles.title}>
          Edit Group
        </Text>

        <View style={{ width: 42 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <Text style={styles.label}>
          Group name
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Group name"
          placeholderTextColor="#9298A2"
          maxLength={120}
          style={styles.input}
        />

        <Text style={styles.label}>
          Description
        </Text>

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Add a description"
          placeholderTextColor="#9298A2"
          maxLength={255}
          multiline
          textAlignVertical="top"
          style={[
            styles.input,
            styles.descriptionInput,
          ]}
        />

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        <Pressable
          onPress={() => void handleSave()}
          disabled={isSaving}
          style={[
            styles.saveButton,
            isSaving
              && styles.saveButtonDisabled,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Check
              size={20}
              color="#FFFFFF"
            />
          )}

          <Text style={styles.saveText}>
            {isSaving
              ? "Saving..."
              : "Save Changes"}
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
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
  topBarButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#07111F",
  },
  content: {
    flexGrow: 1,
    padding: 22,
    paddingBottom: 40,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "900",
    color: "#242B35",
  },
  input: {
    minHeight: 56,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    fontSize: 16,
    color: "#07111F",
  },
  descriptionInput: {
    minHeight: 120,
    paddingTop: 16,
  },
  errorCard: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 15,
    backgroundColor: "#FFF1F1",
  },
  errorText: {
    color: "#9F2424",
    fontWeight: "700",
    textAlign: "center",
  },
  saveButton: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    borderRadius: 17,
    backgroundColor: "#F3344A",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#69707C",
    fontWeight: "700",
  },
});
