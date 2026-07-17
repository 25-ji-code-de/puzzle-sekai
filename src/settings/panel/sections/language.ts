import {
  setLocale,
  SUPPORTED_LOCALES,
  getLocale,
  Locale,
  t,
} from "../../../i18n";
import {
  makeChip,
  makeOptionsRow,
  makeSettingGroup,
  type SettingsSectionCtx,
} from "../widgets";

export const appendLanguageSection = (
  panel: HTMLElement,
  ctx: SettingsSectionCtx,
): void => {
  const group = makeSettingGroup(t("settings.lang.label"));
  const options = makeOptionsRow();
  const currentLocale = getLocale();
  SUPPORTED_LOCALES.forEach(({ value, label }) => {
    options.appendChild(
      makeChip(label, value === currentLocale, () => {
        setLocale(value as Locale);
        ctx.refresh();
      }),
    );
  });
  group.appendChild(options);
  panel.appendChild(group);
};
