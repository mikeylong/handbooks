'use strict';
// Canonical, fictional source for the three rules used in this prototype.
// Stable approval identities preserve existing reviews after the brand rename.
// Change approvalKey when a rule's meaning, values, or scope changes.
const veloriPalette=Object.freeze({ink:'#20262b',slate:'#515a60',muted:'#6b7378',line:'#c7ccd0',white:'#ffffff',paper:'#fcfcf9',cloud:'#f7f8f9',mist:'#edf0f2'});
const veloriExpressionColors=Object.freeze({white:'#f4f6f2',mint:'#78ebc8',blue:'#80c8ff',amber:'#ffcc70'});
window.VELORI_DESIGN_SYSTEM = Object.freeze({
  name: 'Velori Design System',
  version: '1.4',
  owner: 'Velori Design',
  approvalKey: 'miro-rules-1',
  authorityKey: 'Miro design owner',
  colors:Object.freeze({
    palette:veloriPalette,
    roles:Object.freeze({text:'ink',secondary:'slate',subtle:'muted',border:'line',surface:'white',canvas:'paper',soft:'cloud',selectedFill:'mist',selectedBorder:'ink',selectionMark:'ink',onSelectionMark:'white',hover:'mist',focus:'ink'}),
    rule:'Use Ink borders and circular marks over a Mist fill for selected controls. Keep checkmarks white, and use an Ink focus ring. Selection also needs a border, mark, and selected control state.',
    expression:veloriExpressionColors
  }),
  icons: Object.freeze({
    approvalKey:'velori-icons-1',grid:24,stroke:1.5,selectionSize:16,
    rule:'Use one 24px icon grid with a 1.5px round stroke. Keep selection marks in a 16px circle, separate from option labels. A mark, border, and selected control state identify the current choice.',
    paths:Object.freeze({
      check:Object.freeze(['M5 12.5 9.5 17 19 7']),
      'chevron-down':Object.freeze(['m5 9 7 7 7-7']),
      'face-friendly':Object.freeze(['M5 8q2-3 4 0m6 0q2-3 4 0M9 14q3 3 6 0']),
      'face-simple':Object.freeze(['M6.5 9h1M16.5 9h1M9 15h6'])
    })
  }),
  primaryButton: Object.freeze({
    anchor: 'primary-button',
    name: 'Primary button',
    scope: 'Use for the main action that moves the robot configuration forward.',
    rule: 'Use Ink fill, white text, 12px corners, and a 48px height.',
    expected: Object.freeze({fill:veloriPalette.ink, radius:12, height:48, text:veloriPalette.white, label:'Continue'}),
    tokens: Object.freeze({fill:'color.ink', text:'color.white', radius:'radius.control', height:'size.primary-action'})
  }),
  optionGroup: Object.freeze({
    anchor: 'option-group',
    name: 'Option group',
    scope: 'Use a 24px gap between adjacent cards in the configurator’s finish and accessory groups.',
    rule: 'Keep 24px of space between option cards.',
    expected: Object.freeze({gap:24}),
    tokens: Object.freeze({gap:'space.option-group'})
  }),
  selectControl: Object.freeze({
    approvalKey: 'velori-select-3',
    anchor: 'select-control',
    name: 'Select control',
    scope: 'When a dropdown is used to choose the face expression color, use this select control.',
    rule: 'Use a soft surface, 40px height, 12px corners, 16px left padding, and 48px right padding. Keep the 12px caret 16px from the right edge. Open a white panel with 16px corners, 8px padding, color swatches, and a selected checkmark.',
    expected: Object.freeze({height:40,radius:12,paddingLeft:16,paddingRight:48,caretSize:12,caretInset:16,fill:veloriPalette.cloud,border:veloriPalette.line}),
    menu: Object.freeze({radius:16,padding:8,gap:8,optionHeight:40}),
    colors: veloriExpressionColors,
    tokens: Object.freeze({height:'size.select',radius:'radius.control',paddingLeft:'space.select-start',paddingRight:'space.select-end',caretInset:'space.select-caret'})
  })
});
// Both the source specimens and proposed corrections use these same values.
{
  const ds=window.VELORI_DESIGN_SYSTEM, style=document.documentElement.style;
  for(const [key,value] of Object.entries(ds.colors.palette))style.setProperty('--velori-color-'+key,value);
  for(const [key,value] of Object.entries(ds.colors.roles))style.setProperty('--velori-color-'+key,ds.colors.palette[value]);
  for(const [key,value] of Object.entries(ds.colors.expression))style.setProperty('--velori-expression-'+key,value);
  style.setProperty('--velori-icon-stroke',ds.icons.stroke);
  style.setProperty('--velori-ink',ds.primaryButton.expected.fill);
  style.setProperty('--velori-white',ds.primaryButton.expected.text);
  style.setProperty('--velori-control-radius',ds.primaryButton.expected.radius+'px');
  style.setProperty('--velori-primary-height',ds.primaryButton.expected.height+'px');
  style.setProperty('--velori-option-gap',ds.optionGroup.expected.gap+'px');
  for(const [key,value] of Object.entries(ds.selectControl.menu))style.setProperty('--velori-select-menu-'+key,value+'px');
  for(const [key,value] of Object.entries(ds.selectControl.expected))style.setProperty('--velori-select-'+key,typeof value==='number'?value+'px':value);
}
