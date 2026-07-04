/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "packages-must-not-import-workers",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^workers/" },
    },
    {
      name: "packages-must-not-import-apps",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
  },
};
