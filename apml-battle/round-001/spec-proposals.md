# APML Spec Proposals from Cowch Battle Round 1

**Role**: ARBITER
**Date**: 2024-12-05
**Source Application**: Cowch (vanilla JavaScript PWA)

---

## Proposal 1: Stateful Recursive Operations

### Gap
GAP-1 identified that APML cannot express recursive algorithms with mutable state that persists across recursive calls.

### Original Code
```javascript
async function typeNodes(targetParent, nodes) {
    for (let node of nodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            const textNode = document.createTextNode('');
            targetParent.appendChild(textNode);
            for (let i = 0; i < text.length; i++) {
                textNode.textContent += text[i]; // Mutable state
                await sleep(delay);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = document.createElement(node.nodeName);
            targetParent.appendChild(element);
            await typeNodes(element, node.childNodes); // Recursive call
        }
    }
}
```

### Proposed APML Extension

```xml
<behavior name="type-nodes" type="recursive-effect">
  <input name="targetParent" type="element"/>
  <input name="nodes" type="nodelist"/>

  <state name="currentTextNode" type="element" scope="local"/>

  <for-each item="node" in="$nodes">
    <match on="node.nodeType">

      <case value="TEXT_NODE">
        <let name="currentTextNode" value="createTextNode('')"/>
        <append element="$currentTextNode" to="$targetParent"/>

        <for-each char="c" in="node.textContent">
          <mutate target="$currentTextNode.textContent" operation="append" value="$c"/>
          <scroll-to-bottom/>
          <await duration="computed-delay($c)"/>
        </for-each>
      </case>

      <case value="ELEMENT_NODE">
        <let name="newElement" value="createElement(node.nodeName)"/>
        <copy-attributes from="$node" to="$newElement"/>
        <append element="$newElement" to="$targetParent"/>
        <recurse input-targetParent="$newElement" input-nodes="node.childNodes"/>
      </case>

    </match>
  </for-each>
</behavior>
```

### New Constructs
1. `<state scope="local">` - Mutable variable scoped to current invocation
2. `<mutate operation="append">` - In-place mutation of existing values
3. `<await duration="expr">` - Async pause with computed duration
4. `<recurse input-*="">` - Explicit recursive invocation with parameter binding
5. `<match on="">` / `<case value="">` - Pattern matching construct

### Rationale
Recursive DOM processing is common in interactive applications. Without stateful recursion, APML forces developers to escape to raw JavaScript, defeating the purpose of the abstraction.

---

## Proposal 2: Gesture Primitives

### Gap
GAP-2 identified that multi-touch gesture recognition with distance thresholds cannot be expressed in APML.

### Original Code
```javascript
let startY = 0, pullDistance = 0, isPulling = false;

element.addEventListener('touchstart', (e) => {
    if (scrollTop === 0) {
        startY = e.touches[0].pageY;
        isPulling = true;
    }
}, { passive: true });

element.addEventListener('touchmove', (e) => {
    pullDistance = e.touches[0].pageY - startY;
}, { passive: true });

element.addEventListener('touchend', () => {
    if (pullDistance > 80) triggerAction();
    // reset state
});
```

### Proposed APML Extension

```xml
<gesture name="pull-to-refresh" target="chat-messages">
  <type>pull-down</type>

  <activation>
    <condition property="scrollTop" equals="0"/>
  </activation>

  <thresholds>
    <threshold name="hint" distance="40px" feedback="visual"/>
    <threshold name="trigger" distance="80px" feedback="haptic-light"/>
  </thresholds>

  <on-threshold name="trigger">
    <action type="call" behavior="handlePromptButtonClick"/>
  </on-threshold>

  <options passive="true"/>
</gesture>
```

### New Constructs
1. `<gesture>` - Top-level gesture definition
2. `<type>` - Predefined gesture types: `pull-down`, `pull-up`, `swipe-left`, `swipe-right`, `pinch`, `rotate`, `long-press`
3. `<activation>` - Conditions under which gesture tracking begins
4. `<thresholds>` - Distance/angle/duration breakpoints
5. `<on-threshold>` - Actions triggered at threshold crossings
6. `<options>` - Event listener configuration

### Rationale
Touch gestures are fundamental to mobile web apps. Expressing them declaratively enables:
- Platform-optimized implementations
- Accessibility alternatives
- Consistent gesture behavior

---

## Proposal 3: Scoped State Blocks

### Gap
GAP-9 identified that closure-based state encapsulation (private handlers, cleanup) cannot be expressed.

### Original Code
```javascript
function showConfirm(message, onConfirm) {
    const handleOk = () => {
        cleanup();
        onConfirm?.();
    };
    const handleCancel = () => {
        cleanup();
    };
    const cleanup = () => {
        modal.classList.remove('active');
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', handleCancel);
    };

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
}
```

### Proposed APML Extension

```xml
<behavior name="show-confirm" type="scoped-interaction">
  <input name="message" type="string"/>
  <input name="onConfirm" type="callback" optional="true"/>

  <scope>
    <setup>
      <set target="#confirm-message.textContent" value="$message"/>
      <add-class target="#confirm-modal" class="active"/>
    </setup>

    <handlers auto-cleanup="true">
      <handler event="click" target="#confirm-ok">
        <action type="call" callback="$onConfirm" if="$onConfirm"/>
        <teardown/>
      </handler>

      <handler event="click" target="#confirm-cancel">
        <teardown/>
      </handler>

      <handler event="click" target="#confirm-modal" filter="event.target === this">
        <teardown/>
      </handler>

      <handler event="keydown" target="document" filter="event.key === 'Escape'">
        <teardown/>
      </handler>
    </handlers>

    <teardown>
      <remove-class target="#confirm-modal" class="active"/>
      <!-- handlers auto-removed due to auto-cleanup="true" -->
    </teardown>
  </scope>
</behavior>
```

### New Constructs
1. `<scope>` - Defines a stateful interaction context
2. `<setup>` / `<teardown>` - Lifecycle hooks
3. `<handlers auto-cleanup="true">` - Event handlers that auto-remove on teardown
4. `<handler filter="expr">` - Conditional handler execution
5. `<input type="callback">` - First-class callback parameters

### Rationale
Modal dialogs, tooltips, dropdowns, and other ephemeral UI all require scoped state with automatic cleanup. This pattern is ubiquitous in web development.

---

## Proposal 4: Platform Conditional Blocks

### Gap
GAP-7 identified that platform-specific code branches (iOS handling) cannot be expressed cleanly.

### Original Code
```javascript
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0';
    input.addEventListener('focus', () => body.classList.add('keyboard-open'));
}
```

### Proposed APML Extension

```xml
<platform-rules>

  <rule platform="ios" version=">=13">
    <meta name="viewport" set-content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>

    <behavior-override target="chat-input">
      <on event="focus">
        <add-class target="body" class="keyboard-open"/>
      </on>
      <on event="blur">
        <remove-class target="body" class="keyboard-open"/>
      </on>
    </behavior-override>
  </rule>

  <rule platform="android" feature="vibration">
    <enable behavior="haptic"/>
  </rule>

  <rule platform="web" standalone="true">
    <add-class target="body" class="pwa-mode"/>
  </rule>

  <rule platform="web" standalone="false">
    <show target="#install-prompt"/>
  </rule>

</platform-rules>
```

### New Constructs
1. `<platform-rules>` - Container for conditional platform blocks
2. `<rule platform="..." version="..." feature="...">` - Conditional block
3. `platform` values: `ios`, `android`, `web`, `desktop`, `safari`, `chrome`, etc.
4. `standalone` attribute for PWA detection
5. `<behavior-override>` - Platform-specific behavior modification

### Rationale
Cross-platform applications routinely need platform-specific handling. Expressing this declaratively enables:
- Compile-time optimization (dead code elimination)
- Clear documentation of platform behavior
- Easier testing of platform variants

---

## Proposal 5: Animation Coordination

### Gap
GAP-8 identified that CSS animation completion detection with fallback timers cannot be expressed.

### Original Code
```javascript
element.style.transition = 'transform 4s ease-in-out';
element.style.transform = 'scale(1.3)';

await new Promise(resolve => {
    element.addEventListener('transitionend', resolve, { once: true });
    setTimeout(resolve, 4100); // Fallback
});
```

### Proposed APML Extension

```xml
<animation-sequence name="breathing-cycle">

  <step name="expand">
    <animate target="#breathing-circle"
             property="transform"
             to="scale(1.3)"
             duration="4s"
             easing="ease-in-out"/>
    <await animation="complete" fallback-timeout="4100ms"/>
  </step>

  <step name="hold-expanded">
    <display instruction="Hold..."/>
    <await duration="4s"/>
  </step>

  <step name="contract">
    <animate target="#breathing-circle"
             property="transform"
             to="scale(1)"
             duration="4s"
             easing="ease-in-out"/>
    <await animation="complete" fallback-timeout="4100ms"/>
  </step>

  <step name="hold-contracted">
    <await duration="4s"/>
  </step>

  <repeat count="4"/>

  <on-complete>
    <display instruction="Well done!"/>
    <record-engagement domain="M"/>
    <haptic style="success"/>
  </on-complete>

  <on-interrupt>
    <cancel-animations/>
    <reset-state/>
  </on-interrupt>

</animation-sequence>
```

### New Constructs
1. `<animation-sequence>` - Named, interruptible animation sequence
2. `<animate>` with CSS property animation
3. `<await animation="complete" fallback-timeout="">` - Wait for animation with fallback
4. `<repeat count="n">` - Loop the sequence
5. `<on-interrupt>` - Handle sequence cancellation

### Rationale
Guided exercises, onboarding flows, and interactive tutorials all require precise animation coordination. The current gap forces mixing APML with raw JavaScript.

---

## Proposal 6: Text Transformation Pipelines

### Gap
GAP-10 identified that custom markdown parsing with order-dependent transformations cannot be expressed.

### Original Code
```javascript
// Order matters: lists before inline, bold before italic
formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
formatted = formatted.replace(/(?<![*_])\*([^*]+)\*(?![*_])/g, '<em>$1</em>');
```

### Proposed APML Extension

```xml
<text-processor name="chat-markdown">
  <input type="string"/>
  <output type="html"/>

  <!-- Execution order is declaration order -->
  <pipeline>
    <!-- Block-level first -->
    <stage name="horizontal-rules">
      <match pattern="^([-_*]){3,}$" flags="m"/>
      <replace with="<hr/>"/>
    </stage>

    <stage name="headers">
      <match pattern="^(#{1,3})\s+(.+)$" flags="m"/>
      <replace with="<h{length($1)+2}>$2</h{length($1)+2}>"/>
    </stage>

    <stage name="unordered-lists">
      <match-block pattern="^[-*]\s+(.+)$" flags="m"/>
      <wrap-consecutive with="<ul>" item-wrap="<li>$1</li>"/>
    </stage>

    <!-- Inline after block -->
    <stage name="bold">
      <match pattern="\*\*(.+?)\*\*"/>
      <replace with="<strong>$1</strong>"/>
    </stage>

    <stage name="italic">
      <match pattern="(?<![*_])\*(?!\*)([^*]+)\*(?![*_])"/>
      <replace with="<em>$1</em>"/>
    </stage>

    <!-- Wrapping last -->
    <stage name="paragraphs">
      <split on="\n\n"/>
      <filter exclude="^<(h[3-5]|ul|li|hr)"/>
      <wrap with="<p>$content</p>"/>
      <join/>
    </stage>
  </pipeline>
</text-processor>
```

### New Constructs
1. `<text-processor>` - Named text transformation pipeline
2. `<pipeline>` - Ordered sequence of transformation stages
3. `<stage>` - Individual transformation step
4. `<match pattern="">` with full regex support including lookbehind
5. `<match-block>` - Match consecutive lines
6. `<wrap-consecutive>` - Group matching lines
7. `<split>` / `<filter>` / `<wrap>` / `<join>` - Functional transformations

### Rationale
Custom markdown dialects, syntax highlighting, and content sanitization all require ordered regex pipelines. The current APML treats parsing as a black box.

---

## Proposal 7: Procedural Graphics

### Gap
GAP-3 identified that algorithmic SVG generation (bezier curves, random offsets) cannot be expressed declaratively.

### Original Code
```javascript
function generateTreeSVG(count) {
    const trunkPath = `M${width/2} ${height} Q${width/2-5} ${height-trunkHeight/2} ${width/2} ${height-trunkHeight}`;
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI;
        // ... bezier generation
    }
}
```

### Proposed APML Extension

```xml
<procedural-graphic name="choice-tree" output="svg">
  <input name="count" type="integer"/>
  <canvas width="200" height="300"/>

  <computed>
    <let name="trunkHeight" value="height * 0.4"/>
    <let name="branchCount" value="min(count, 12)"/>
  </computed>

  <draw>
    <!-- Trunk with bezier -->
    <path stroke="#8B4513" stroke-width="8" fill="none">
      <moveto x="width/2" y="height"/>
      <quadratic-bezier
        control-x="width/2 - 5"
        control-y="height - trunkHeight/2"
        end-x="width/2"
        end-y="height - trunkHeight"/>
    </path>

    <!-- Branches via loop -->
    <for i="0" to="branchCount">
      <let name="angle" value="(i / branchCount) * PI - PI/2"/>
      <let name="length" value="30 + random() * 20"/>
      <let name="startY" value="height - trunkHeight + (i * 15)"/>

      <path stroke="#8B4513" stroke-width="4" fill="none">
        <moveto x="width/2" y="startY"/>
        <quadratic-bezier
          control-x="width/2 + cos(angle) * length/2"
          control-y="startY + sin(angle) * length/2"
          end-x="width/2 + cos(angle) * length"
          end-y="startY + sin(angle) * length"/>
      </path>
    </for>

    <!-- Leaves with color cycling -->
    <for i="0" to="count">
      <circle
        cx="random-in-bounds(50, 150)"
        cy="random-in-bounds(30, height - trunkHeight + 20)"
        r="8"
        fill="hsl(90 + (i * 30) % 60, 70%, 50%)"/>
    </for>
  </draw>
</procedural-graphic>
```

### New Constructs
1. `<procedural-graphic>` - Algorithmic graphics generator
2. `<canvas width="" height="">` - Output dimensions
3. `<computed>` - Pre-calculated values
4. `<draw>` - Drawing instructions
5. `<path>` with `<moveto>`, `<quadratic-bezier>`, `<lineto>`, etc.
6. `<for>` loop within graphics context
7. Built-in functions: `random()`, `random-in-bounds()`, `sin()`, `cos()`, `min()`, `max()`

### Rationale
Data visualization, generative art, and custom charts all require procedural graphics. The current APML only supports declarative static SVG.

---

## Proposal 8: Extended Event Triggers

### Gap
GAP-4 identified that event listener options (`passive`, `capture`, `once`) cannot be expressed.

### Proposed APML Extension

```xml
<trigger event="touchmove" target="chat-messages"
         passive="true"
         capture="false"
         once="false"
         signal="$abortController">
  <action type="track-pull-distance"/>
</trigger>

<trigger event="submit" target="form" prevent-default="true">
  <action type="handle-submit"/>
</trigger>
```

### New Attributes
1. `passive="true|false"` - Allow default behavior
2. `capture="true|false"` - Capture phase
3. `once="true|false"` - Auto-remove after first fire
4. `signal="$controller"` - AbortController reference
5. `prevent-default="true"` - Prevent default action

### Rationale
Event listener options significantly impact performance (passive scrolling) and behavior (once). This is a straightforward extension.

---

## Summary: Proposed APML v2.1 Extensions

| Proposal | Gap Addressed | Priority | Complexity |
|----------|---------------|----------|------------|
| Stateful Recursion | GAP-1 | HIGH | HIGH |
| Gesture Primitives | GAP-2 | HIGH | MEDIUM |
| Scoped State Blocks | GAP-9 | HIGH | MEDIUM |
| Platform Conditionals | GAP-7 | MEDIUM | LOW |
| Animation Coordination | GAP-8 | MEDIUM | MEDIUM |
| Text Pipelines | GAP-10 | MEDIUM | MEDIUM |
| Procedural Graphics | GAP-3 | MEDIUM | HIGH |
| Extended Triggers | GAP-4 | LOW | LOW |

### Not Addressed (Escape Hatch Recommended)

- **GAP-5 (Runtime CSS)**: Recommend `<script type="escape">` block
- **GAP-6 (Storage Errors)**: Extend `<on-error>` with error taxonomy
- **GAP-11 (Modules)**: Consider `<visibility>` attribute on behaviors
- **GAP-12 (External Scripts)**: Recommend `<resources>` section

---

## Implementation Notes

These proposals are designed to:

1. **Preserve Declarative Nature**: All new constructs describe WHAT, not HOW
2. **Enable Optimization**: Compilers can generate platform-optimal code
3. **Support Static Analysis**: Intent is analyzable without execution
4. **Allow Graceful Degradation**: Features can be polyfilled or omitted
5. **Maintain Composability**: New constructs work with existing APML

The next round of battle should test these proposals against a more complex application to validate their expressiveness.
