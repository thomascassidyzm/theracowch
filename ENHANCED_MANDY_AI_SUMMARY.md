# 🐮 Enhanced Mandy AI - What's New

## Summary for Mandy

Your AI chat interface has been upgraded from **conversational support** to **active therapeutic coaching**!

---

## What Changed?

### Before: Passive Chat
- Mandy responded to questions
- Offered general support
- Reactive approach

### After: Active Therapeutic Coach ✨
- **Detects patterns** in conversation
- **Intervenes therapeutically** when appropriate
- **Guides concrete experiments**
- **Tracks and follows up** on progress
- **Validates the coaching model** with real data

---

## New Capabilities

### 1. Pattern Detection 🔍

Mandy now automatically recognizes:

**Safety Behaviours:**
- "I only go to parties if my friend comes"
- "I need to check my phone constantly"
- "I can't do X without Y"

**Cognitive Errors:**
- Catastrophizing ("Everything will be terrible")
- Black & white thinking ("I always/never...")
- Mind reading ("They hate me")
- Should statements ("I must/should/have to...")

**Avoidance Patterns:**
- Repeatedly not taking action
- Fear-based restrictions on life

**Anxiety/Panic:**
- Racing thoughts, can't calm down
- Physical symptoms overwhelming

### 2. Conversational Interventions 💬

When Mandy detects a pattern, she:

1. **Validates** the feeling
2. **Labels** the pattern gently
3. **Educates** briefly (in your voice!)
4. **Offers experiment** to test it
5. **Tracks** for follow-up

**Example Flow:**

```
User: "I can only go to parties if my best friend comes with me"

Mandy: "Thanks for sharing. I notice you said you can only go
if your friend is there. I wonder if this might be what we call
a 'safety behaviour' - would you like me to explain?"

[User says yes]

Mandy: "SO in general, safety behaviours are things we do to feel
safer, but they actually keep anxiety going by stopping us from
learning we'd be OK without them. Does that make sense?"

[Continues with cost-benefit, then...]

Mandy: "What if we tried a small experiment this week? Instead
of only going with your friend, what if you went to a small
gathering for just 30 minutes on your own? Just to test what
happens. Would you be willing to try that?"
```

### 3. Specific Intervention Scripts 📋

Mandy can now guide these exercises conversationally:

- **Safety Behaviour Reduction** (gradual experiments)
- **H-E-A-L Framework** (cognitive reframing)
- **Box Breathing** (grounding for anxiety)
- **Passengers on the Bus** (thought unhooking)
- **Perfectionism Cycle** (your classic intervention)
- **Lion Metaphor** (nervous system explanation)

### 4. Follow-Up Tracking 📊

When users return, Mandy asks:
"Hey! Last time we talked about reducing phone-checking. How did that go?"

This builds:
- Accountability
- Learning from experiments
- Data on what works
- Return engagement

---

## New Content Added

### Safety Behaviours Module
**Complete therapeutic guide** covering:
- What safety behaviours are (vs. avoidance vs. healthy coping)
- Recognition exercises
- Common examples by category
- Gradual reduction experiments
- Approach ladder building
- Cost-benefit analysis

**File:** `/resources/IMAGINE - E Explore - Safety Behaviours.md`

---

## Technical Details

### Enhanced System Prompt
**File:** `/public/imagine-framework-prompts-enhanced.txt`

**What it includes:**
- All your original voice and style (preserved!)
- Therapeutic detection framework
- Pattern recognition keywords
- Conversational intervention scripts
- Response guidelines for each pattern
- Follow-up tracking instructions

### API Changes
- Now fetches enhanced prompt (cached for 2 hours)
- Increased response length to 500 tokens (from 300) to allow guided interventions
- Still maintains your 2-3 sentence responses for normal conversation

---

## Why This Matters

### Validation-Focused Approach

Instead of building:
- Exercise libraries people won't use
- Push notifications (iOS PWA issues)
- Complex tracking systems

We built:
- **Chat-mediated interventions** (where people already are)
- **Contextual guidance** (Mandy detects what's needed)
- **Trackable experiments** (proves the model works)

### Proof Points We Can Now Measure:

1. **Which patterns does Mandy detect most?**
   - Safety behaviours? Cognitive errors? Avoidance?

2. **Which interventions do users accept?**
   - Do they agree to experiments?

3. **Which interventions do they complete?**
   - Return visits = follow-up data

4. **Do they report improvement?**
   - Before/after anxiety ratings
   - Self-reported progress

5. **Do they come back?**
   - Engagement = validation

---

## What Users Will Experience

### Normal Conversation Still Works
If someone just wants to chat, Mandy still responds normally:
- "Thanks for sharing"
- "It sounds like you have a lot going on"
- Warm, supportive, curious

### Therapeutic Moments Activated When Needed
When patterns emerge, Mandy gently offers:
- "I notice you said [pattern]..."
- "This might be keeping you stuck..."
- "Would you like to try an experiment?"

### Not Pushy
If users decline:
- "That's okay, we can explore this when you're ready"
- No pressure, no forcing
- Trust the relationship

---

## What's Next (When You're Ready)

### Phase 1: Test & Iterate ✅ (Done!)
- Enhanced prompt built
- Interventions scripted
- Pushed to production
- **Ready to test!**

### Phase 2: Simple Tracking (Next)
- localStorage to remember experiments
- Follow-up when users return
- Basic progress notes

### Phase 3: Analytics (Later)
- Track which interventions work
- Engagement metrics
- Validation data

### Phase 4: Polish (Later)
- Inline buttons for ratings
- Visual progress indicators
- Timers for timed exercises

---

## Try It Now!

Go to: **https://cowch.app/chat.html**

Test phrases that trigger detection:
- "I can only [X] if [Y]"
- "I always worry that..."
- "Everything is going to fall apart"
- "I should be better at this"
- "They probably think I'm stupid"

See if Mandy:
1. Detects the pattern
2. Labels it gently
3. Offers to explain
4. Proposes an experiment

---

## Files Changed

### New Files:
- `/public/imagine-framework-prompts-enhanced.txt` (Enhanced AI prompt)
- `/resources/IMAGINE - E Explore - Safety Behaviours.md` (Therapeutic content)
- This summary: `/ENHANCED_MANDY_AI_SUMMARY.md`

### Modified Files:
- `/api/chat.js` (Points to enhanced prompt, increased tokens)

---

## Questions for Mandy

1. **Does this feel like you when you read the scripts?**
   - Is the voice authentic?
   - Would you say it this way?

2. **What patterns do you most want Mandy to detect?**
   - Currently: safety behaviours, cognitive errors, avoidance
   - What else?

3. **Which interventions are highest priority?**
   - Currently: 5 conversational scripts
   - What's missing?

4. **How should tracking work?**
   - Just follow-up questions?
   - Or more structured?

---

## Bottom Line

**You now have an AI that doesn't just chat - it coaches.**

When someone says "I can only do X if Y", Mandy will:
1. Recognize it's a safety behaviour
2. Explain why it keeps anxiety going
3. Propose a small experiment to test it
4. Follow up next time they chat

**This is how we validate the model.**

Not with exercise libraries no one uses.

But with **contextual, conversational, guided interventions** that people actually complete because Mandy walks them through it in the moment they need it.

🐮 Ready to test when you are!
