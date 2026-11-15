import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import Header from '../../components/Header';
import AppText from '../../components/AppText';
import Icon from '../../components/Icon';
import StarIcon from '../../components/icons/StarIcon';
import { ui } from '../../components/customer/ui';
import { formatPrice, ratingLabel, restaurant } from '../../data/catalog';
import { CHAT_STARTERS, historyForServer, localChatReply } from '../../data/aiChat';
import { getFoodPhoto } from '../../data/foodPhotos';
import { selectAvailableItems } from '../../redux/menuSlice';
import { requestAIChat } from '../../services/aiRecommendations';
import { routes } from '../../navigation/routes';
import { COLORS } from '../../theme/colors';
import { RADIUS, SPACING } from '../../theme/spacing';
import { TYPOGRAPHY } from '../../theme/typography';

const PREVIEW_COUNT = 4;
let nextId = 0;
const newId = () => `m${Date.now()}-${nextId++}`;

// FoodMind AI as a chat: every prompt stays on this screen, results appear in the conversation,
// and follow-ups ("cheaper ones", "something spicy instead") build on the earlier turns.
export default function AIScreen({ navigation, route }) {
  const menuItems = useSelector(selectAvailableItems);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const messagesRef = useRef(messages);
  const conversationRef = useRef(0);
  const mountedRef = useRef(true);
  const scrollRef = useRef(null);
  // Where to scroll after the next layout: the bottom while waiting, then the question that was answered.
  const scrollTargetRef = useRef(null);
  const positionsRef = useRef({});
  const autoPromptRef = useRef(null);
  messagesRef.current = messages;

  useEffect(() => () => { mountedRef.current = false; }, []);

  const busy = messages.some(message => message.status === 'loading');
  const lastAssistant = [...messages].reverse().find(message => message.role === 'assistant' && message.status === 'done');

  const send = useCallback(async raw => {
    const prompt = String(raw || '').trim();
    if (!prompt || messagesRef.current.some(message => message.status === 'loading')) return;
    const history = historyForServer(messagesRef.current);
    const pendingId = newId();
    const questionId = newId();
    const conversation = conversationRef.current;
    scrollTargetRef.current = 'end';
    setInput('');
    setMessages(previous => [...previous, { id: questionId, role: 'user', text: prompt }, { id: pendingId, role: 'assistant', status: 'loading' }]);

    let result;
    let offline = false;
    try {
      result = await requestAIChat({ prompt, history, menu: menuItems });
    } catch {
      result = localChatReply(menuItems, prompt, history);
      offline = true;
    }
    // Ignore answers that arrive after the screen closed or a new chat started.
    if (!mountedRef.current || conversation !== conversationRef.current) return;
    scrollTargetRef.current = questionId;
    setMessages(previous => previous.map(message => message.id === pendingId ? { ...message, ...result, status: 'done', offline } : message));
  }, [menuItems]);

  // "Ask AI" from Search or No Match opens the chat with that request already sent.
  const routePrompt = route?.params?.prompt;
  useEffect(() => {
    const key = `${route?.key || ''}:${routePrompt || ''}`;
    if (!routePrompt || !String(routePrompt).trim() || autoPromptRef.current === key) return;
    autoPromptRef.current = key;
    send(routePrompt);
  }, [route?.key, routePrompt, send]);

  function newChat() {
    conversationRef.current += 1;
    positionsRef.current = {};
    setMessages([]);
    setInput('');
  }

  const update = (id, changes) => setMessages(previous => previous.map(message => message.id === id ? { ...message, ...changes } : message));
  const openDish = dishId => navigation.navigate(routes.DISH_DETAIL, { dishId });
  const compare = dishIds => navigation.navigate(routes.COMPARE_DISHES, { dishIds });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header title="FoodMind AI" centerTitle onBack={() => navigation.goBack()}
          right={messages.length ? <Pressable accessibilityRole="button" accessibilityLabel="Start a new chat" hitSlop={10} onPress={newChat} style={styles.headerButton}>
            <Icon name="newChat" size={17} color={COLORS.text} />
          </Pressable> : null} />

        <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={[styles.content, !messages.length && styles.contentEmpty]}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            const target = scrollTargetRef.current;
            if (!target) return;
            scrollTargetRef.current = null;
            if (target === 'end') scrollRef.current?.scrollToEnd?.({ animated: true });
            else scrollRef.current?.scrollTo?.({ y: Math.max(0, (positionsRef.current[target] ?? 0) - 8), animated: true });
          }}>
          {!messages.length ? <Welcome onPick={send} /> : messages.map(message => message.role === 'user'
            ? <UserBubble key={message.id} text={message.text} onLayout={event => { positionsRef.current[message.id] = event.nativeEvent.layout.y; }} />
            : <AssistantMessage key={message.id} message={message} menuItems={menuItems}
              onOpen={openDish} onCompare={compare} onUpdate={changes => update(message.id, changes)} />)}
        </ScrollView>

        <View style={styles.footer}>
          {!busy && lastAssistant?.suggestions?.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled" contentContainerStyle={styles.suggestions}>
            {lastAssistant.suggestions.map(text => <Pressable key={text} accessibilityRole="button" onPress={() => send(text)} style={styles.suggestion}>
              <Icon name="ai" size={11} />
              <AppText variant="small" style={ui.bold}>{text}</AppText>
            </Pressable>)}
          </ScrollView> : null}
          <View style={[styles.composer, focused && styles.composerFocused]}>
            <Icon name="ai" size={16} color={focused ? COLORS.primary : COLORS.textSecondary} />
            <TextInput accessibilityLabel="Message FoodMind AI" value={input} onChangeText={setInput} maxLength={200}
              placeholder={messages.length ? 'Ask for something else' : "Describe what you're craving"}
              placeholderTextColor={COLORS.textSecondary} style={styles.input} returnKeyType="send" blurOnSubmit={false}
              onSubmitEditing={() => send(input)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
            <Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: busy || !input.trim() }}
              disabled={busy || !input.trim()} onPress={() => send(input)}
              style={[styles.sendButton, (busy || !input.trim()) && styles.sendDisabled]}>
              {busy ? <ActivityIndicator size="small" color={COLORS.white} /> : <Icon name="send" size={15} color={COLORS.white} />}
            </Pressable>
          </View>
          <AppText variant="caption" color={COLORS.textSecondary} style={ui.center}>FoodMind AI can make mistakes.</AppText>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Welcome({ onPick }) {
  return <Animated.View entering={FadeIn.duration(300)} style={styles.welcome}>
    <View style={styles.aiSquare}><Icon name="ai" size={24} color={COLORS.white} /></View>
    <View>
      <AppText variant="heading">Hey there!</AppText>
      <AppText variant="heading" color={COLORS.primary}>Let dinner find you</AppText>
    </View>
    <AppText color={COLORS.textSecondary}>What sounds good tonight? Mention a dish, a budget, a diet or even your mood.</AppText>
    <View style={styles.starters}>
      {CHAT_STARTERS.map(item => <Pressable key={item.text} accessibilityRole="button" onPress={() => onPick(item.text)} style={styles.starter}>
        <AppText variant="small">{item.emoji}</AppText>
        <AppText variant="small" style={ui.bold}>{item.text}</AppText>
      </Pressable>)}
    </View>
  </Animated.View>;
}

function UserBubble({ text, onLayout }) {
  return <View style={styles.userRow} onLayout={onLayout}>
    <View style={styles.userBubble}><AppText>{text}</AppText></View>
  </View>;
}

function AssistantMessage({ message, menuItems, onOpen, onCompare, onUpdate }) {
  // Dishes are looked up in the live menu, so prices follow partner edits and hidden dishes drop out.
  const dishes = useMemo(() => {
    const byId = new Map(menuItems.map(dish => [dish.id, dish]));
    return (message.recommendations || []).map(item => byId.get(item.dishId)).filter(Boolean);
  }, [menuItems, message.recommendations]);

  if (message.status === 'loading') {
    return <View style={styles.thinking} accessibilityLiveRegion="polite">
      <ActivityIndicator size="small" color={COLORS.primary} />
      <AppText variant="small" color={COLORS.textSecondary}>Hold tight! Finding the best matches for you</AppText>
    </View>;
  }

  const shown = message.expanded ? dishes : dishes.slice(0, PREVIEW_COUNT);
  return <Animated.View entering={FadeIn.duration(250)} style={styles.assistant}>
    <View style={styles.assistantHead}>
      <View style={styles.avatar}><Icon name="ai" size={12} color={COLORS.white} /></View>
      <AppText style={ui.flex}>{message.reply}</AppText>
    </View>
    {message.offline ? <View style={ui.row}>
      <Icon name="info" size={12} color={COLORS.textSecondary} />
      <AppText variant="caption" color={COLORS.textSecondary} style={ui.flex}>FoodMind AI is offline, so these are matches from the menu.</AppText>
    </View> : null}

    {dishes.length ? <>
      <View style={ui.between}>
        <AppText variant="subheading" style={ui.flex} numberOfLines={2}>{message.title || 'Recommended for you'}</AppText>
        {dishes.length > 1 ? <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onCompare([dishes[0].id, dishes[1].id])} style={ui.row}>
          <Icon name="swap" size={12} />
          <AppText variant="small" color={COLORS.primary} style={ui.bold}>Compare</AppText>
        </Pressable> : null}
      </View>
      <View style={styles.grid}>
        {shown.map((dish, index) => <ResultCard key={dish.id} dish={dish} top={index === 0} onPress={() => onOpen(dish.id)} />)}
      </View>
      {dishes.length > PREVIEW_COUNT ? <Pressable accessibilityRole="button" onPress={() => onUpdate({ expanded: !message.expanded })} style={styles.showMore}>
        <AppText variant="small" style={ui.bold}>{message.expanded ? 'Show less' : `Show ${dishes.length - PREVIEW_COUNT} more`}</AppText>
        <Icon name={message.expanded ? 'chevronUp' : 'chevronDown'} size={11} color={COLORS.text} />
      </Pressable> : null}
      <View style={styles.feedback}>
        <AppText variant="caption" color={COLORS.textSecondary} style={ui.flex}>
          {message.feedback ? 'Thanks for the feedback!' : 'Thoughts on these recommendations?'}
        </AppText>
        {['up', 'down'].map(value => <Pressable key={value} accessibilityRole="button" hitSlop={8}
          accessibilityLabel={value === 'up' ? 'Helpful recommendations' : 'Unhelpful recommendations'}
          accessibilityState={{ selected: message.feedback === value }}
          onPress={() => onUpdate({ feedback: message.feedback === value ? null : value })}
          style={[styles.thumb, message.feedback === value && styles.thumbSelected]}>
          <Icon name={value === 'up' ? 'thumbsUp' : 'thumbsDown'} size={12} color={message.feedback === value ? COLORS.white : COLORS.textSecondary} />
        </Pressable>)}
      </View>
    </> : null}
  </Animated.View>;
}

function ResultCard({ dish, top, onPress }) {
  const photo = getFoodPhoto(dish);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${dish.name}, ${formatPrice(dish.price)}`} onPress={onPress} style={styles.card}>
    <View>
      {photo ? <Image source={photo} style={styles.photo} accessibilityIgnoresInvertColors />
        : <View style={[styles.photo, styles.photoEmpty]}><AppText style={styles.emoji}>{dish.symbol || '🍽️'}</AppText></View>}
      {top ? <View style={styles.pick}><AppText variant="caption" color={COLORS.white} style={ui.bold}>Top pick</AppText></View> : null}
      <View style={styles.time}><AppText variant="caption" style={ui.bold}>{restaurant.time}</AppText></View>
    </View>
    <View style={styles.cardBody}>
      <View style={styles.meta}>
        <Icon name="store" size={10} color={COLORS.textSecondary} />
        <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={1} style={styles.shrink}>{restaurant.name}</AppText>
        <StarIcon />
        <AppText variant="caption" color={COLORS.warning} style={ui.bold}>{ratingLabel(dish)}</AppText>
      </View>
      <AppText variant="small" style={ui.bold} numberOfLines={2}>{dish.name}</AppText>
      <AppText variant="small" color={COLORS.primary} style={ui.bold}>{formatPrice(dish.price)}</AppText>
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20, gap: 18 },
  contentEmpty: { flexGrow: 1, justifyContent: 'center' },

  welcome: { gap: SPACING.lg },
  aiSquare: { width: 56, height: 56, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, justifyContent: 'center', alignItems: 'center' },
  starters: { alignItems: 'flex-start', gap: 10 },
  starter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },

  userRow: { alignItems: 'flex-end' },
  userBubble: { maxWidth: '82%', backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryBorder, borderWidth: 1, borderRadius: RADIUS.lg, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },

  thinking: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  assistant: { gap: 12 },
  assistantHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginTop: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  card: { width: '48.5%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  photo: { width: '100%', height: 118, backgroundColor: COLORS.primaryLight },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 40, lineHeight: 50 },
  pick: { position: 'absolute', top: 8, left: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  time: { position: 'absolute', bottom: 8, right: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  cardBody: { padding: 10, gap: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shrink: { flexShrink: 1 },
  showMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thumb: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  thumbSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  footer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, gap: 8, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  suggestions: { gap: 8, paddingRight: 8 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.primaryBorder, backgroundColor: COLORS.primaryLight },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.pill, paddingLeft: 16, paddingRight: 6, paddingVertical: 6 },
  composerFocused: { borderColor: COLORS.primary },
  input: { ...TYPOGRAPHY.body, flex: 1, color: COLORS.text, paddingVertical: 6 },
  sendButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { backgroundColor: COLORS.disabled },
});
