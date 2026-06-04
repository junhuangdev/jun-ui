class JuiClassElement extends HTMLElement {
  connectedCallback() {
    const className = this.constructor.juiClassName;
    if (className) this.classList.add(className);
  }
}

function moveSlottedChildren(host, slotName, target) {
  for (const child of [...host.children]) {
    if (child.getAttribute("slot") === slotName) {
      child.removeAttribute("slot");
      target.append(child);
    }
  }
}

class JuiPageHeader extends HTMLElement {
  connectedCallback() {
    this.classList.add("jui-page-header");
    if (this.dataset.juiHydrated === "true") return;

    const heading = this.getAttribute("heading");
    const subheading = this.getAttribute("subheading");
    if (!heading && !subheading) return;

    const content = document.createElement("div");
    content.className = "jui-page-header__content";

    if (heading) {
      const title = document.createElement("h1");
      title.className = "jui-heading";
      title.textContent = heading;
      content.append(title);
    }

    if (subheading) {
      const description = document.createElement("p");
      description.className = "jui-subheading";
      description.textContent = subheading;
      content.append(description);
    }

    const actions = document.createElement("div");
    actions.className = "jui-page-header__actions";
    moveSlottedChildren(this, "actions", actions);

    this.prepend(content);
    if (actions.childElementCount > 0) this.append(actions);
    this.dataset.juiHydrated = "true";
  }
}

class JuiSectionTitle extends HTMLElement {
  connectedCallback() {
    this.classList.add("jui-section-title");
    if (this.dataset.juiHydrated === "true") return;

    const heading = this.getAttribute("heading");
    const subheading = this.getAttribute("subheading");
    if (!heading && !subheading) return;

    if (heading) {
      const title = document.createElement("h2");
      title.className = "jui-section-heading";
      title.textContent = heading;
      this.append(title);
    }

    if (subheading) {
      const description = document.createElement("p");
      description.className = "jui-subheading";
      description.textContent = subheading;
      this.append(description);
    }

    this.dataset.juiHydrated = "true";
  }
}

class JuiStat extends HTMLElement {
  connectedCallback() {
    this.classList.add("jui-stat");
    if (this.dataset.juiHydrated === "true") return;

    const label = this.getAttribute("label");
    const value = this.getAttribute("value");
    const note = this.getAttribute("note");
    if (!label && !value && !note) return;

    if (label) {
      const labelNode = document.createElement("span");
      labelNode.className = "jui-stat__label";
      labelNode.textContent = label;
      this.append(labelNode);
    }

    if (value) {
      const valueNode = document.createElement("strong");
      valueNode.className = "jui-stat__value";
      valueNode.textContent = value;
      this.append(valueNode);
    }

    if (note) {
      const noteNode = document.createElement("span");
      noteNode.className = "jui-stat__note";
      noteNode.textContent = note;
      this.append(noteNode);
    }

    this.dataset.juiHydrated = "true";
  }
}

class JuiEmptyState extends HTMLElement {
  connectedCallback() {
    this.classList.add("jui-empty-state");
    if (this.dataset.juiHydrated === "true") return;

    const heading = this.getAttribute("heading");
    const message = this.getAttribute("message");
    if (!heading && !message) return;

    if (heading) {
      const title = document.createElement("h2");
      title.className = "jui-section-heading";
      title.textContent = heading;
      this.append(title);
    }

    if (message) {
      const description = document.createElement("p");
      description.className = "jui-subheading";
      description.textContent = message;
      this.append(description);
    }

    this.dataset.juiHydrated = "true";
  }
}

if (!customElements.get("jui-app-shell")) customElements.define("jui-app-shell", class extends JuiClassElement {
  static juiClassName = "jui-shell";
});
if (!customElements.get("jui-panel")) customElements.define("jui-panel", class extends JuiClassElement {
  static juiClassName = "jui-panel";
});
if (!customElements.get("jui-stack")) customElements.define("jui-stack", class extends JuiClassElement {
  static juiClassName = "jui-stack";
});
if (!customElements.get("jui-grid")) customElements.define("jui-grid", class extends JuiClassElement {
  static juiClassName = "jui-grid";
});
if (!customElements.get("jui-page-header")) customElements.define("jui-page-header", JuiPageHeader);
if (!customElements.get("jui-section-title")) customElements.define("jui-section-title", JuiSectionTitle);
if (!customElements.get("jui-stat")) customElements.define("jui-stat", JuiStat);
if (!customElements.get("jui-empty-state")) customElements.define("jui-empty-state", JuiEmptyState);
