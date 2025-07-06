import h from 'mithril/hyperscript'
import * as helper from '../helper'
import { dropShadowHeader, backButton } from '../shared/common'
import formWidgets from '../shared/form'
import layout from '../layout'
import i18n from '../../i18n'
import settings from '../../settings'
import bluetooth from '../../externalDevice/bluetooth'
import { OptionType, BoolOption, EnumOption, FloatOption, IntOption, StrOption } from '../../externalDevice/Option'

function convertToReadable(str: string): string {
  const s = str.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderBody() {
  const items = [
    h('li.list_item', {},
      formWidgets.renderCheckbox(
        i18n('useBluetoothDevice'),
        'bluetooth',
        settings.general.bluetooth.useDevice,
        bluetooth.onSettingChange
      )
    )
  ]

  if (bluetooth.features().option) {
    items.push(
      h('li.list_item', { 
        style: { textAlign: 'center', fontWeight: 'bold' }
      }, i18n('deviceOptions'))
    )
    items.push(
      h('li.list_item.refresh', {
        oncreate: helper.ontapY(() => bluetooth.protocol().onCentralOptionsReset())
      }, i18n('resetToDefault')),
    )
    for (const option of bluetooth.options()) {
      if (option.type === OptionType.Bool) {
        const boolOption = option as BoolOption;
        items.push(
          h('li.list_item', {},
            formWidgets.renderCheckbox(
              convertToReadable(boolOption.name),
              boolOption.name,
              function(value?: boolean): boolean {
                if (value !== undefined) {
                  return value
                }
                return boolOption.value
              },
              function(value?: boolean): void {
                if (value !== undefined) {
                  boolOption.value = value
                }
              }
            )
          )
        )
      }
      else if (option.type === OptionType.Enum) {
        const enumOption = option as EnumOption;
        items.push(
          h('li.list_item', {},
            formWidgets.renderSelectOption(
              convertToReadable(enumOption.name),
              enumOption.name,
              enumOption.values.map(v => [convertToReadable(v), v]),
              function(value?: string): string {
                if (value !== undefined) {
                  return value
                }
                return enumOption.value
              },
              false,
              function(value?: string): void {
                if (value !== undefined) {
                  enumOption.value = value
                }
              }
            )
          )
        )
      }
      else if (option.type === OptionType.Str) {
        const strOption = option as StrOption;
        items.push(
          h('li.list_item', {},
            formWidgets.renderTextEditOption(
              convertToReadable(strOption.name),
              strOption.name,
              function(value?: string): string {
                if (value !== undefined) {
                  return value
                }
                return strOption.value
              },
              function(value?: string): void {
                if (value !== undefined) {
                  strOption.value = value
                }
              }
            )
          )
        )
      }
      else if (option.type === OptionType.Int) {
        const intOption = option as IntOption;
        items.push(
          h('li.list_item', {},
            formWidgets.renderSliderOption(
              convertToReadable(intOption.name),
              intOption.name,
              intOption.min,
              intOption.max,
              intOption.step ?? 1,
              function(value?: number): number {
                if (value !== undefined) {
                  return value
                }
                return intOption.value
              },
              function(value?: number): void {
                if (value !== undefined) {
                  intOption.value = value
                }
              }
            )
          )
        )
      }
      else if (option.type === OptionType.Float) {
        const floatOption = option as FloatOption;
        items.push(
          h('li.list_item', {},
            formWidgets.renderSliderOption(
              convertToReadable(floatOption.name),
              floatOption.name,
              floatOption.min,
              floatOption.max,
              floatOption.step ?? 0.01,
              function(value?: number): number {
                if (value !== undefined) {
                  return value
                }
                return floatOption.value
              },
              function(value?: number): void {
                if (value !== undefined) {
                  floatOption.value = value
                }
              }
            )
          )
        )
      }
    }
  }

  return h('ul.native_scroller.page.settings_list.game', items)
}

export default {
  oncreate: helper.viewSlideIn,

  view() {
    const header = dropShadowHeader(null, backButton(i18n('bluetooth')))
    return layout.free(header, renderBody())
  }
}
