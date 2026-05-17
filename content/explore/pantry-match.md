---
type: 'family'
category: 'explore'
family: 'pantry'
status: 'complete'
title: 'Pantry match'
desc: 'List the ingredients you have. See which recipes are within reach — and which are one or two shopping items away.'
metaDesc: 'Find recipes by what is already in your pantry. Type or paste an ingredient list; results rank by how much of each recipe you already have.'
updated: '2026-05-17'
pageTitle: 'Pantry match'
---

<div class="fam-shell">
  <main class="fam-main" id="main-content">
    <header class="fam-hero" data-family="pantry">
      <span class="fam-hero-eyebrow">Pantry match</span>
      <h1 class="fam-hero-title">What can I cook with what I have?</h1>
      <p class="fam-hero-desc">Type or paste an ingredient list — one per line, or comma-separated. Recipes rank by how much you already have on hand, with the missing pieces called out.</p>
      <svg class="fam-hero-ornament" viewBox="0 0 240 14" aria-hidden="true" focusable="false">
        <path d="M4 7 Q 60 1, 116 7 T 236 7" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity="0.5"/>
        <circle cx="120" cy="7" r="2" fill="currentColor" opacity="0.65"/>
      </svg>
    </header>

    <!-- auto-link-skip -->
    <section class="pantry-match" data-pantry-match>
      <div class="pantry-match-input-row">
        <label for="pantry-input" class="pantry-match-label">Your ingredients</label>
        <textarea
          id="pantry-input"
          class="pantry-match-input"
          rows="5"
          placeholder="e.g.&#10;tomato&#10;garlic&#10;basil&#10;olive oil&#10;pasta&#10;parmesan"
          spellcheck="false"
          autocomplete="off"
          data-pantry-textarea></textarea>
        <div class="pantry-match-actions">
          <button type="button" class="pantry-match-btn" data-pantry-find>Find recipes</button>
          <button type="button" class="pantry-match-btn pantry-match-btn-ghost" data-pantry-clear>Clear</button>
          <span class="pantry-match-hint" data-pantry-count></span>
        </div>
      </div>

      <div class="pantry-match-suggest" data-pantry-suggest hidden>
        <span class="pantry-suggest-label">Common pantry starters:</span>
        <button type="button" class="pantry-suggest-chip" data-pantry-add="salt">salt</button>
        <button type="button" class="pantry-suggest-chip" data-pantry-add="black-pepper">black pepper</button>
        <button type="button" class="pantry-suggest-chip" data-pantry-add="olive-oil">olive oil</button>
        <button type="button" class="pantry-suggest-chip" data-pantry-add="garlic">garlic</button>
        <button type="button" class="pantry-suggest-chip" data-pantry-add="onion">onion</button>
        <button type="button" class="pantry-suggest-chip" data-pantry-add="butter">butter</button>
        <button type="button" class="pantry-suggest-chip" data-pantry-add="egg">egg</button>
        <button type="button" class="pantry-suggest-chip" data-pantry-add="all-purpose-flour">flour</button>
        <button type="button" class="pantry-suggest-chip" data-pantry-add="granulated-sugar">sugar</button>
      </div>

      <div class="pantry-match-results" data-pantry-results aria-live="polite"></div>
    </section>
    <!-- /auto-link-skip -->

    <!--FAMILY_CROSSLINKS-->
  </main>
</div>

<script src="../../scripts/pantry-match.js?v=2" defer></script>