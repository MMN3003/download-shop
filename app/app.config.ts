export default defineAppConfig({
  ui: {
    colors: { primary: 'emerald', neutral: 'zinc' },
    // The panel body is a scrolling flex column; without this, cards shrink to the screen height and get cut off
    dashboardPanel: { slots: { body: '*:shrink-0' } },
  },
})
