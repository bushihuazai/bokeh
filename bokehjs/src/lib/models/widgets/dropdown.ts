import {AbstractButton, AbstractButtonView} from "./abstract_button"

import {ButtonClick, MenuItemClick} from "core/bokeh_events"
import type {StyleSheetLike} from "core/dom"
import {div, display, undisplay} from "core/dom"
import type * as p from "core/properties"
import {isString} from "core/util/types"
import type {CallbackLike1} from "core/util/callbacks"
import {execute} from "core/util/callbacks"

import * as buttons from "styles/buttons.css"
import dropdown_css, * as dropdown from "styles/dropdown.css"
import carets_css, * as carets from "styles/caret.css"

export class DropdownView extends AbstractButtonView {
  declare model: Dropdown

  protected _open: boolean = false

  protected menu: HTMLElement

  override stylesheets(): StyleSheetLike[] {
    return [...super.stylesheets(), dropdown_css, carets_css]
  }

  override render(): void {
    super.render()

    const caret = div({class: [carets.caret, carets.down]})

    if (!this.model.is_split) {
      this.button_el.appendChild(caret)
    } else {
      const toggle = this._render_button(caret)
      toggle.classList.add(buttons.dropdown_toggle)
      toggle.addEventListener("click", () => this._toggle_menu())
      this.group_el.appendChild(toggle)
    }

    const items = this.model.menu.map((item, i) => {
      if (item == null) {
        return div({class: dropdown.divider})
      } else {
        const label = isString(item) ? item : item[0]
        const el = div(label)
        el.addEventListener("click", () => this._item_click(i))
        return el
      }
    })

    this.menu = div({class: [dropdown.menu, dropdown.below]}, items)
    this.shadow_el.appendChild(this.menu)
    undisplay(this.menu)
  }

  protected _show_menu(): void {
    if (!this._open) {
      this._open = true
      display(this.menu)

      const listener = (event: MouseEvent) => {
        if (!event.composedPath().includes(this.el)) {
          document.removeEventListener("click", listener)
          this._hide_menu()
        }
      }
      document.addEventListener("click", listener)
    }
  }

  protected _hide_menu(): void {
    if (this._open) {
      this._open = false
      undisplay(this.menu)
    }
  }

  protected _toggle_menu(): void {
    if (this._open) {
      this._hide_menu()
    } else {
      this._show_menu()
    }
  }

  override click(): void {
    if (!this.model.is_split) {
      this._toggle_menu()
    } else {
      this._hide_menu()
      this.model.trigger_event(new ButtonClick())
      super.click()
    }
  }

  protected _item_click(i: number): void {
    this._hide_menu()

    const item = this.model.menu[i]
    if (item != null) {
      const value_or_callback = isString(item) ? item : item[1]
      if (isString(value_or_callback)) {
        this.model.trigger_event(new MenuItemClick(value_or_callback))
      } else {
        execute(value_or_callback, this.model, {index: i}) // TODO
      }
    }
  }
}

export namespace Dropdown {
  export type Attrs = p.AttrsOf<Props>

  export type Props = AbstractButton.Props & {
    split: p.Property<boolean>
    menu: p.Property<(string | [string, string | CallbackLike1<Dropdown, {index: number}>] | null)[]>
  }
}

export interface Dropdown extends Dropdown.Attrs {}

export class Dropdown extends AbstractButton {
  declare properties: Dropdown.Props
  declare __view_type__: DropdownView

  constructor(attrs?: Partial<Dropdown.Attrs>) {
    super(attrs)
  }

  static {
    this.prototype.default_view = DropdownView

    this.define<Dropdown.Props>(({Null, Boolean, String, Array, Tuple, Or}) => ({
      split: [ Boolean, false ],
      menu:  [ Array(Or(String, Tuple(String, Or(String /*TODO*/)), Null)), [] ],
    }))

    this.override<Dropdown.Props>({
      label: "Dropdown",
    })
  }

  get is_split(): boolean {
    return this.split
  }
}
