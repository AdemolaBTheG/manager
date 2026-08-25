import { SymbolView, type SFSymbol } from "expo-symbols";
import { PressableScale } from "pressto";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardController,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeOut,
  FadeOutLeft,
  LinearTransition,
  ReduceMotion,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AiGeneratedBorder } from "@/components/ai-generated-border";
import { ThemedText } from "@/components/themed-text";
import { FontSize, Sizing, Spacing } from "@/constants/theme";
import {
  REAL_SITUATION_LIMITS,
  REAL_SITUATION_RELATIONSHIPS,
  hasMinimumSituationDetail,
  type ConfirmedRealSituation,
  type NormalizedRealSituation,
  type RealSituationInput,
} from "@/domain/real-situation";
import {
  PRACTICE_CATEGORIES,
  type PracticeCategory,
  type RelationshipType,
} from "@/domain/scenario";
import { useSemanticHaptics } from "@/hooks/use-semantic-haptics";
import { useTheme } from "@/hooks/use-theme";

export type BuilderStep = 0 | 1 | 2 | 3;

type RealSituationBuilderScreenProps = {
  isNormalizing: boolean;
  isStarting: boolean;
  normalizationError: string | null;
  onNormalize: (input: RealSituationInput) => Promise<NormalizedRealSituation>;
  onStart: (situation: ConfirmedRealSituation) => Promise<void>;
  onStepChange: (step: BuilderStep) => void;
};

const STEP_MOTION = FadeInRight.duration(180)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const STEP_EXIT = FadeOutLeft.duration(120)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const FACT_LAYOUT = LinearTransition.duration(180)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const FACT_ENTER = FadeIn.duration(160)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const FACT_EXIT = FadeOut.duration(120)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const FOOTER_ACTION_LAYOUT = LinearTransition.duration(180)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const BACK_ENTER = FadeInLeft.duration(160)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const BACK_EXIT = FadeOutLeft.duration(120)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const ACTION_LABEL_ENTER = FadeIn.duration(140)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const ACTION_LABEL_EXIT = FadeOut.duration(100)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
let nextObservableFactId = 0;

function createObservableFactId() {
  nextObservableFactId += 1;
  return `observable-fact-${nextObservableFactId}`;
}

export function RealSituationBuilderScreen({
  isNormalizing,
  isStarting,
  normalizationError,
  onNormalize,
  onStart,
  onStepChange,
}: RealSituationBuilderScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { playReady } = useSemanticHaptics();
  const [step, setStep] = useState<BuilderStep>(0);
  const progress = useSharedValue(0);
  const [conversationType, setConversationType] =
    useState<PracticeCategory | null>(null);
  const [relationshipType, setRelationshipType] =
    useState<RelationshipType | null>(null);
  const [counterpartAlias, setCounterpartAlias] = useState("");
  const [observableFacts, setObservableFacts] = useState([""]);
  const [desiredChange, setDesiredChange] = useState("");
  const [fearedResponse, setFearedResponse] = useState("");
  const [relationshipContext, setRelationshipContext] = useState("");
  const [normalized, setNormalized] = useState<NormalizedRealSituation | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusy = isNormalizing || isStarting;
  const primaryActionLabel =
    step === 2
      ? "Prepare simulation"
      : step === 3
        ? "Check readiness"
        : "Continue";

  const moveToStep = (nextStep: BuilderStep) => {
    KeyboardController.dismiss();
    progress.value = withTiming(nextStep, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
    setStep(nextStep);
    onStepChange(nextStep);
  };

  const buildInput = (): RealSituationInput | null => {
    if (!conversationType || !relationshipType) {
      return null;
    }
    return {
      conversationType,
      relationshipType,
      counterpartAlias,
      observableFacts: observableFacts.map(cleanText).filter(Boolean),
      desiredChange,
      fearedResponse,
      relationshipContext,
    };
  };

  const handleContinue = async () => {
    setErrorMessage(null);

    if (step === 0) {
      if (!conversationType || !relationshipType) {
        setErrorMessage("Choose a conversation type and relationship.");
        return;
      }
      moveToStep(1);
      return;
    }

    if (step === 1) {
      const cleanedFacts = observableFacts.map(cleanText).filter(Boolean);
      if (cleanedFacts.length === 0) {
        setErrorMessage("Add at least one observable fact.");
        return;
      }
      const incompleteFactIndex = cleanedFacts.findIndex(
        (fact) => !hasMinimumSituationDetail(fact),
      );
      if (incompleteFactIndex >= 0) {
        setErrorMessage(
          `Make fact ${incompleteFactIndex + 1} a complete, specific statement.`,
        );
        return;
      }
      setObservableFacts(cleanedFacts);
      moveToStep(2);
      return;
    }

    if (step === 2) {
      if (!cleanText(desiredChange) || !cleanText(fearedResponse)) {
        setErrorMessage("Add what needs to change and the response you fear.");
        return;
      }
      if (!hasMinimumSituationDetail(desiredChange)) {
        setErrorMessage("Describe the change in a little more detail.");
        return;
      }
      if (!hasMinimumSituationDetail(fearedResponse)) {
        setErrorMessage(
          "Describe the response you fear in a little more detail.",
        );
        return;
      }
      const input = buildInput();
      if (!input) {
        setErrorMessage("The situation is missing its setup.");
        return;
      }
      try {
        const result = await onNormalize(input);
        setNormalized(result);
        playReady();
        moveToStep(3);
      } catch {
        // The route supplies a specific request error below the action.
      }
      return;
    }

    const input = buildInput();
    if (!input || !normalized || input.observableFacts.length === 0) {
      setErrorMessage("The confirmed situation is incomplete.");
      return;
    }
    try {
      await onStart({
        ...input,
        ...normalized,
        summary: input.observableFacts.join(" "),
        managerObjective: input.desiredChange,
        possibleMotivations: normalized.possibleMotivations
          .map(cleanText)
          .filter(Boolean),
      });
    } catch {
      setErrorMessage("Couldn’t create the rehearsal. Please try again.");
    }
  };

  const handleBack = () => {
    if (isBusy || step === 0) {
      return;
    }
    setErrorMessage(null);
    if (step === 3) {
      setNormalized(null);
    }
    moveToStep((step - 1) as BuilderStep);
  };

  const displayedError = errorMessage ?? normalizationError;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View
        accessibilityLabel={`Step ${step + 1} of 4`}
        style={styles.progressRow}
      >
        {[0, 1, 2, 3].map((index) => (
          <ProgressSegment
            activeColor={theme.primary}
            inactiveColor={theme.backgroundSelected}
            index={index}
            key={index}
            progress={progress}
          />
        ))}
      </View>

      <KeyboardAwareScrollView
        bottomOffset={Sizing.control.large + Spacing.three}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        mode="insets"
        contentInsetAdjustmentBehavior="automatic"
      >
        <Animated.View
          key={step}
          entering={STEP_MOTION}
          exiting={STEP_EXIT}
          style={styles.stepContent}
        >
          {step === 0 ? (
            <SetTheSceneStep
              counterpartAlias={counterpartAlias}
              conversationType={conversationType}
              onAliasChange={setCounterpartAlias}
              onConversationTypeChange={setConversationType}
              onRelationshipTypeChange={setRelationshipType}
              relationshipType={relationshipType}
            />
          ) : null}
          {step === 1 ? (
            <ObservableFactsStep
              facts={observableFacts}
              onChange={setObservableFacts}
            />
          ) : null}
          {step === 2 ? (
            <DesiredChangeStep
              desiredChange={desiredChange}
              fearedResponse={fearedResponse}
              onDesiredChange={setDesiredChange}
              onFearedResponse={setFearedResponse}
              onRelationshipContext={setRelationshipContext}
              relationshipContext={relationshipContext}
            />
          ) : null}
          {step === 3 && normalized && conversationType && relationshipType ? (
            <ReviewStep
              counterpartAlias={counterpartAlias || "Alex"}
              conversationType={conversationType}
              desiredChange={desiredChange}
              facts={observableFacts}
              fearedResponse={fearedResponse}
              possibleMotivations={normalized.possibleMotivations}
              relationshipContext={relationshipContext}
              relationshipType={relationshipType}
            />
          ) : null}
        </Animated.View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView
        offset={{ opened: insets.bottom }}
        pointerEvents="box-none"
        style={styles.floatingFooter}
      >
        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, Spacing.three),
            },
          ]}
        >
          {step > 0 ? (
            <Animated.View
              entering={BACK_ENTER}
              exiting={BACK_EXIT}
              layout={FOOTER_ACTION_LAYOUT}
            >
              <PressableScale
                accessibilityRole="button"
                disabled={isBusy}
                onPress={handleBack}
                style={[
                  styles.secondaryButton,
                  { backgroundColor: theme.background },
                ]}
              >
                <ThemedText style={styles.secondaryButtonText}>Back</ThemedText>
              </PressableScale>
            </Animated.View>
          ) : null}
          <Animated.View
            layout={FOOTER_ACTION_LAYOUT}
            style={styles.primaryActionGroup}
          >
            {displayedError ? (
              <ThemedText
                accessibilityLiveRegion="polite"
                style={styles.errorText}
                themeColor="primary"
              >
                {displayedError}
              </ThemedText>
            ) : null}
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ busy: isBusy, disabled: isBusy }}
              disabled={isBusy}
              onPress={handleContinue}
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            >
              {isBusy ? (
                <ActivityIndicator color={theme.onPrimary} />
              ) : (
                <>
                  <Animated.View
                    entering={ACTION_LABEL_ENTER}
                    exiting={ACTION_LABEL_EXIT}
                    key={primaryActionLabel}
                    layout={FOOTER_ACTION_LAYOUT}
                  >
                    <ThemedText
                      style={styles.primaryButtonText}
                      themeColor="onPrimary"
                    >
                      {primaryActionLabel}
                    </ThemedText>
                  </Animated.View>
                  <SymbolView
                    name="arrow.right"
                    size={Sizing.icon.small}
                    tintColor={theme.onPrimary}
                  />
                </>
              )}
            </PressableScale>
          </Animated.View>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

function ProgressSegment({
  activeColor,
  inactiveColor,
  index,
  progress,
}: {
  activeColor: string;
  inactiveColor: string;
  index: number;
  progress: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const activation = interpolate(
      progress.value,
      [index - 1, index],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      backgroundColor: interpolateColor(
        activation,
        [0, 1],
        [inactiveColor, activeColor],
      ),
    };
  });

  return <Animated.View style={[styles.progressSegment, animatedStyle]} />;
}

function SetTheSceneStep({
  counterpartAlias,
  conversationType,
  onAliasChange,
  onConversationTypeChange,
  onRelationshipTypeChange,
  relationshipType,
}: {
  counterpartAlias: string;
  conversationType: PracticeCategory | null;
  onAliasChange: (value: string) => void;
  onConversationTypeChange: (value: PracticeCategory) => void;
  onRelationshipTypeChange: (value: RelationshipType) => void;
  relationshipType: RelationshipType | null;
}) {
  return (
    <>
      <StepHeading
        body="Choose the conversation and who it’s with."
        title="Set the scene"
      />
      <ChoiceGroup
        label="Conversation type"
        onChange={onConversationTypeChange}
        options={Object.values(PRACTICE_CATEGORIES).map((category) => ({
          label: category.label,
          value: category.id,
        }))}
        value={conversationType}
      />
      <ChoiceGroup
        label="Relationship"
        onChange={onRelationshipTypeChange}
        options={Object.entries(REAL_SITUATION_RELATIONSHIPS).map(
          ([value, label]) => ({ label, value: value as RelationshipType }),
        )}
        value={relationshipType}
      />
      <Field
        label="Name or alias"
        maxLength={REAL_SITUATION_LIMITS.alias}
        onChangeText={onAliasChange}
        placeholder="Alex (optional)"
        value={counterpartAlias}
      />
      <PrivacyNotice />
    </>
  );
}

function ObservableFactsStep({
  facts,
  onChange,
}: {
  facts: string[];
  onChange: (facts: string[]) => void;
}) {
  const [factIds, setFactIds] = useState(() =>
    facts.map(() => createObservableFactId()),
  );

  const addFact = () => {
    setFactIds((current) => [...current, createObservableFactId()]);
    onChange([...facts, ""]);
  };

  const removeFact = (index: number) => {
    setFactIds((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
    onChange(facts.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <>
      <StepHeading
        body="Use things someone could observe or verify. Leave out guesses about intent."
        title="What happened?"
      />
      <View style={styles.fieldsGroup}>
        {facts.map((fact, index) => (
          <Animated.View
            entering={index === 0 ? undefined : FACT_ENTER}
            exiting={FACT_EXIT}
            key={factIds[index]}
            layout={FACT_LAYOUT}
          >
            <Field
              label={`Observable fact ${index + 1}`}
              labelAction={
                facts.length > 1 ? (
                  <DeleteButton
                    label={`Remove observable fact ${index + 1}`}
                    onPress={() => removeFact(index)}
                  />
                ) : null
              }
              maxLength={REAL_SITUATION_LIMITS.fact}
              multiline
              onChangeText={(value) =>
                onChange(
                  facts.map((item, itemIndex) =>
                    itemIndex === index ? value : item,
                  ),
                )
              }
              placeholder="What did they do or say?"
              value={fact}
            />
          </Animated.View>
        ))}
      </View>
      {facts.length < REAL_SITUATION_LIMITS.facts ? (
        <Animated.View layout={FACT_LAYOUT}>
          <AddButton label="Add another fact" onPress={addFact} />
        </Animated.View>
      ) : null}
    </>
  );
}

function PrivacyNotice() {
  const theme = useTheme();
  return (
    <View style={styles.privacyNote}>
      <SymbolView
        name="lock.fill"
        size={Sizing.icon.small}
        tintColor={theme.primary}
      />
      <ThemedText
        selectable
        style={styles.privacyText}
        themeColor="textSecondary"
      >
        Use an alias. Details are saved on this device and sent to the AI
        service for this rehearsal.
      </ThemedText>
    </View>
  );
}

function DesiredChangeStep({
  desiredChange,
  fearedResponse,
  onDesiredChange,
  onFearedResponse,
  onRelationshipContext,
  relationshipContext,
}: {
  desiredChange: string;
  fearedResponse: string;
  onDesiredChange: (value: string) => void;
  onFearedResponse: (value: string) => void;
  onRelationshipContext: (value: string) => void;
  relationshipContext: string;
}) {
  return (
    <>
      <StepHeading
        body="Name the outcome you need and the reaction you want to practice handling."
        title="What needs to change?"
      />
      <View style={styles.fieldsGroup}>
        <Field
          label="What are you asking for?"
          maxLength={REAL_SITUATION_LIMITS.desiredChange}
          multiline
          onChangeText={onDesiredChange}
          placeholder="A clear behavior, boundary, decision, or next step"
          value={desiredChange}
        />
        <Field
          label="What response are you worried about?"
          maxLength={REAL_SITUATION_LIMITS.fearedResponse}
          multiline
          onChangeText={onFearedResponse}
          placeholder="They get defensive, shut down, challenge my authority…"
          value={fearedResponse}
        />
        <Field
          label="Relationship context"
          maxLength={REAL_SITUATION_LIMITS.relationshipContext}
          multiline
          onChangeText={onRelationshipContext}
          placeholder="Optional: history or tension that changes how this may land"
          value={relationshipContext}
        />
      </View>
    </>
  );
}

function ReviewStep({
  counterpartAlias,
  conversationType,
  desiredChange,
  facts,
  fearedResponse,
  possibleMotivations,
  relationshipContext,
  relationshipType,
}: {
  counterpartAlias: string;
  conversationType: PracticeCategory;
  desiredChange: string;
  facts: readonly string[];
  fearedResponse: string;
  possibleMotivations: readonly string[];
  relationshipContext: string;
  relationshipType: RelationshipType;
}) {
  const theme = useTheme();
  return (
    <>
      <View style={styles.reviewIntro}>
        <ThemedText selectable style={styles.identityName}>
          {counterpartAlias}
        </ThemedText>
        <ThemedText
          selectable
          style={styles.identityRelationship}
          themeColor="textSecondary"
        >
          {REAL_SITUATION_RELATIONSHIPS[relationshipType]} ·{" "}
          {PRACTICE_CATEGORIES[conversationType].label}
        </ThemedText>
      </View>

      <View style={styles.reviewFields}>
        <ReadOnlyReviewField icon="list.bullet.clipboard" label="Facts">
          <View style={styles.compactList}>
            {facts.map((fact, index) => (
              <View key={`${index}-${fact}`} style={styles.compactRow}>
                <View
                  style={[
                    styles.compactBullet,
                    { backgroundColor: theme.primary },
                  ]}
                />
                <ThemedText selectable style={styles.compactText}>
                  {fact}
                </ThemedText>
              </View>
            ))}
          </View>
        </ReadOnlyReviewField>
        <ReadOnlyReviewField icon="target" label="What needs to change">
          <ThemedText selectable style={styles.reviewDetailText}>
            {desiredChange}
          </ThemedText>
        </ReadOnlyReviewField>
        <ReadOnlyReviewField icon="message" label="Preparing for">
          <ThemedText selectable style={styles.reviewDetailText}>
            {fearedResponse}
          </ThemedText>
        </ReadOnlyReviewField>
        {cleanText(relationshipContext) ? (
          <ReadOnlyReviewField icon="person.2" label="Relationship context">
            <ThemedText selectable style={styles.reviewDetailText}>
              {relationshipContext}
            </ThemedText>
          </ReadOnlyReviewField>
        ) : null}
      </View>

      <View style={styles.aiContext}>
        <AiGeneratedBorder />
        <View style={styles.aiContextHeader}>
          <SymbolView
            name="sparkles"
            size={Sizing.icon.small}
            tintColor={theme.primary}
          />
          <ThemedText
            accessibilityLabel="Possible motivations, generated by AI"
            style={styles.aiContextTitle}
            themeColor="textSecondary"
          >
            Possible motivations
          </ThemedText>
        </View>
        <View style={styles.motivationList}>
          {possibleMotivations.map((motivation, index) => (
            <View key={`${index}-${motivation}`} style={styles.motivationRow}>
              <View
                style={[
                  styles.compactBullet,
                  { backgroundColor: theme.primary },
                ]}
              />
              <ThemedText selectable style={styles.motivationText}>
                {motivation}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

function ReadOnlyReviewField({
  children,
  icon,
  label,
}: {
  children: React.ReactNode;
  icon: SFSymbol;
  label: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.reviewField, { borderBottomColor: theme.border }]}>
      <View style={styles.reviewDetailLabelRow}>
        <SymbolView
          accessibilityElementsHidden
          accessible={false}
          name={icon}
          size={Sizing.icon.small}
          tintColor={theme.primary}
          weight="semibold"
        />
        <ThemedText style={styles.reviewDetailLabel} themeColor="textSecondary">
          {label}
        </ThemedText>
      </View>
      {children}
    </View>
  );
}

function StepHeading({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.headingGroup}>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={styles.intro} themeColor="textSecondary">
        {body}
      </ThemedText>
    </View>
  );
}

function ChoiceGroup<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: readonly { label: string; value: T }[];
  value: T | null;
}) {
  const theme = useTheme();
  const { playSelection } = useSemanticHaptics();
  const selectionProgress = useSharedValue<number[]>(
    options.map((option) => (option.value === value ? 1 : 0)),
  );

  const handleChange = (index: number, nextValue: T) => {
    if (nextValue === value) return;

    selectionProgress.value = withTiming(
      options.map((_, optionIndex) => (optionIndex === index ? 1 : 0)),
      {
        duration: 180,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      },
    );
    onChange(nextValue);
    playSelection();
  };

  return (
    <View style={styles.fieldGroup}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <View style={styles.choiceWrap}>
        {options.map((option, index) => {
          const selected = value === option.value;
          return (
            <ChoicePill
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              activeBackgroundColor={theme.primary}
              activeTextColor={theme.onPrimary}
              inactiveBackgroundColor={theme.backgroundElement}
              inactiveTextColor={theme.text}
              index={index}
              key={option.value}
              label={option.label}
              onPress={() => handleChange(index, option.value)}
              selectionProgress={selectionProgress}
            />
          );
        })}
      </View>
    </View>
  );
}

function ChoicePill({
  activeBackgroundColor,
  activeTextColor,
  inactiveBackgroundColor,
  inactiveTextColor,
  index,
  label,
  onPress,
  selectionProgress,
  ...accessibilityProps
}: {
  activeBackgroundColor: string;
  activeTextColor: string;
  inactiveBackgroundColor: string;
  inactiveTextColor: string;
  index: number;
  label: string;
  onPress: () => void;
  selectionProgress: SharedValue<number[]>;
} & Pick<
  React.ComponentProps<typeof PressableScale>,
  "accessibilityRole" | "accessibilityState"
>) {
  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      selectionProgress.value[index] ?? 0,
      [0, 1],
      [inactiveBackgroundColor, activeBackgroundColor],
    ),
  }));
  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      selectionProgress.value[index] ?? 0,
      [0, 1],
      [inactiveTextColor, activeTextColor],
    ),
  }));

  return (
    <PressableScale {...accessibilityProps} onPress={onPress}>
      <Animated.View style={[styles.choice, backgroundStyle]}>
        <Animated.Text style={[styles.choiceText, textStyle]}>
          {label}
        </Animated.Text>
      </Animated.View>
    </PressableScale>
  );
}

function Field({
  label,
  labelAction,
  multiline = false,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  labelAction?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.fieldGroup}>
      <View style={styles.fieldLabelRow}>
        <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
        {labelAction}
      </View>
      <TextInput
        {...props}
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor={theme.textSecondary}
        selectionColor={theme.primary}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          { backgroundColor: theme.backgroundElement, color: theme.text },
          props.style,
        ]}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.addButton, { backgroundColor: theme.backgroundElement }]}
    >
      <SymbolView
        name="plus"
        size={Sizing.icon.small}
        tintColor={theme.primary}
      />
      <ThemedText style={styles.addButtonText} themeColor="primary">
        {label}
      </ThemedText>
    </PressableScale>
  );
}

function DeleteButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={[
        styles.deleteButton,
        { backgroundColor: theme.backgroundElement },
      ]}
    >
      <SymbolView
        name="trash"
        size={Sizing.icon.small}
        tintColor={theme.textSecondary}
      />
    </PressableScale>
  );
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  progressRow: {
    flexDirection: "row",
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  progressSegment: { borderRadius: Sizing.radius.pill, flex: 1, height: 3 },
  scrollContent: {
    alignItems: "center",
    flexGrow: 1,
    paddingBottom: Sizing.control.large + Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  stepContent: {
    gap: Spacing.four,
    maxWidth: Sizing.content.compact,
    paddingTop: Spacing.four,
    width: "100%",
  },
  headingGroup: { gap: Spacing.two },
  title: { fontSize: FontSize.title, fontWeight: "600" },
  intro: { fontSize: FontSize.bodyLarge },
  fieldGroup: { gap: Spacing.two },
  fieldLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  fieldLabel: { fontSize: FontSize.small, fontWeight: "700" },
  input: {
    borderCurve: "continuous",
    borderRadius: Sizing.radius.input,
    fontSize: FontSize.body,
    minHeight: Sizing.control.large,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  multilineInput: { minHeight: Sizing.control.multiline },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  choice: {
    borderCurve: "continuous",
    borderRadius: Sizing.radius.pill,
    minHeight: Sizing.control.regular,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  choiceText: { fontSize: FontSize.small, fontWeight: "700" },
  privacyNote: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  privacyText: { flex: 1, fontSize: FontSize.caption },
  fieldsGroup: { gap: Spacing.three },
  deleteButton: {
    alignItems: "center",
    borderRadius: Sizing.radius.pill,
    height: Sizing.control.regular,
    justifyContent: "center",
    width: Sizing.control.regular,
  },
  addButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: Sizing.radius.pill,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: Sizing.control.regular,
    paddingHorizontal: Spacing.three,
  },
  addButtonText: { fontSize: FontSize.small, fontWeight: "700" },
  reviewIntro: { gap: Spacing.one },
  identityName: { fontSize: FontSize.title, fontWeight: "700" },
  identityRelationship: { fontSize: FontSize.small },
  reviewFields: { gap: Spacing.three },
  reviewField: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    marginRight: -Spacing.four,
    paddingBottom: Spacing.three,
    paddingRight: Spacing.four,
  },
  reviewDetailLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  reviewDetailLabel: { fontSize: FontSize.small, fontWeight: "700" },
  reviewDetailText: { fontSize: FontSize.body },
  compactList: { gap: Spacing.two },
  compactRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
  },
  compactBullet: {
    borderRadius: Sizing.radius.pill,
    height: Spacing.one,
    marginTop: Spacing.two,
    width: Spacing.one,
  },
  compactText: { flex: 1, fontSize: FontSize.body },
  aiContext: {
    borderCurve: "continuous",
    borderRadius: Sizing.radius.input,
    gap: Spacing.three,
    padding: Spacing.three,
    position: "relative",
  },
  aiContextHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  aiContextTitle: { fontSize: FontSize.small, fontWeight: "700" },
  motivationList: { gap: Spacing.two },
  motivationRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
  },
  motivationText: { flex: 1, fontSize: FontSize.body },
  floatingFooter: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
  footer: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: Sizing.radius.pill,
    boxShadow: "0 8px 24px rgba(24, 17, 22, 0.16)",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  secondaryButtonText: { fontSize: FontSize.small, fontWeight: "700" },
  primaryActionGroup: { flex: 1, gap: Spacing.two },
  primaryButton: {
    alignItems: "center",
    borderRadius: Sizing.radius.pill,
    boxShadow: "0 10px 30px rgba(66, 28, 49, 0.28)",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  primaryButtonText: { fontSize: FontSize.body, fontWeight: "800" },
  errorText: { fontSize: FontSize.small, textAlign: "center" },
});
