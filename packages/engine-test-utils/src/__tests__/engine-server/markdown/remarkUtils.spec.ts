import { DLink, NoteProps, WorkspaceOpts } from "@dendronhq/common-all";
import { NoteTestUtilsV4 } from "@dendronhq/common-test-utils";
import {
  DendronASTDest,
  DendronASTTypes,
  DEngineClient,
  LinkFilter,
  LinkUtils,
  MDUtilsV4,
  RemarkUtils,
} from "@dendronhq/engine-server";
import _ from "lodash";
import { DVault, runEngineTestV5, testWithEngine } from "../../../engine";
import { ENGINE_HOOKS } from "../../../presets";
import { checkString } from "../../../utils";

const checkLink = ({ src, target }: { src: Partial<DLink>; target: DLink }) => {
  const allTrue = _.every([
    _.isUndefined(src.from) ? true : _.isEqual(src.from, target.from),
    _.isUndefined(src.type) ? true : _.isEqual(src.type, target.type),
  ]);
  if (!allTrue) {
    throw Error(
      `diff between ${JSON.stringify(src, null, 4)} and ${JSON.stringify(
        target,
        null,
        4
      )}`
    );
  }
  expect(true).toBeTruthy();
};

describe("RemarkUtils and LinkUtils", () => {
  describe("findAnchors", async () => {
    test("one header", async () => {
      await runEngineTestV5(
        async ({ engine }) => {
          const note = engine.notes["foo"];
          const body = note.body;
          const out = RemarkUtils.findAnchors(body, {
            engine,
            fname: note.fname,
          });
          expect(out).toMatchSnapshot();
          expect(_.size(out)).toEqual(1);
          expect(out[0].depth).toEqual(1);
          expect(out[0].type).toEqual(DendronASTTypes.HEADING);
        },
        {
          preSetupHook: async ({ vaults, wsRoot }) => {
            await NoteTestUtilsV4.createNote({
              fname: "foo",
              body: [
                "# h1",
                "",
                "Repellendus possimus voluptates tempora quia.",
              ].join("\n"),
              vault: vaults[0],
              wsRoot,
            });
          },
          expect,
        }
      );
    });
    test("one block anchor", async () => {
      await runEngineTestV5(
        async ({ engine }) => {
          const note = engine.notes["foo"];
          const body = note.body;
          const out = RemarkUtils.findAnchors(body, {
            engine,
            fname: note.fname,
          });
          expect(out).toMatchSnapshot();
          expect(_.size(out)).toEqual(1);
          expect(out[0].type).toEqual(DendronASTTypes.BLOCK_ANCHOR);
        },
        {
          preSetupHook: async ({ vaults, wsRoot }) => {
            await NoteTestUtilsV4.createNote({
              fname: "foo",
              body: [
                "Repellendus possimus voluptates tempora quia.",
                "Eum deleniti sit delectus officia rem. ^block-anchor",
                "",
                "Consectetur blanditiis facilis nulla mollitia.",
              ].join("\n"),
              vault: vaults[0],
              wsRoot,
            });
          },
          expect,
        }
      );
    });
    test("doesn't find block anchor within wikilink", async () => {
      await runEngineTestV5(
        async ({ engine }) => {
          const note = engine.notes["foo"];
          const body = note.body;
          const out = RemarkUtils.findAnchors(body, {
            engine,
            fname: note.fname,
          });
          expect(out).toMatchSnapshot();
          expect(_.size(out)).toEqual(0);
        },
        {
          preSetupHook: async ({ vaults, wsRoot }) => {
            await NoteTestUtilsV4.createNote({
              fname: "foo",
              body: [
                "Repellendus possimus voluptates tempora quia.",
                "Eum deleniti sit delectus officia rem.",
                "",
                "[[bar#^block-anchor]]",
                "",
                "Consectetur blanditiis facilis nulla mollitia.",
              ].join("\n"),
              vault: vaults[0],
              wsRoot,
            });
          },
          expect,
        }
      );
    });
  });
  test("doesn't find block anchor within inline code", async () => {
    await runEngineTestV5(
      async ({ engine }) => {
        const note = engine.notes["foo"];
        const body = note.body;
        const out = RemarkUtils.findAnchors(body, {
          engine,
          fname: note.fname,
        });
        expect(out).toMatchSnapshot();
        expect(_.size(out)).toEqual(0);
      },
      {
        preSetupHook: async ({ vaults, wsRoot }) => {
          await NoteTestUtilsV4.createNote({
            fname: "foo",
            body: [
              "Repellendus possimus voluptates tempora quia.",
              "Eum deleniti sit delectus officia rem. `^block-anchor`",
              "",
              "Consectetur blanditiis facilis nulla mollitia.",
            ].join("\n"),
            vault: vaults[0],
            wsRoot,
          });
        },
        expect,
      }
    );
  });
  test("doesn't find block anchor within code block", async () => {
    await runEngineTestV5(
      async ({ engine }) => {
        const note = engine.notes["foo"];
        const body = note.body;
        const out = RemarkUtils.findAnchors(body, {
          engine,
          fname: note.fname,
        });
        expect(out).toMatchSnapshot();
        expect(_.size(out)).toEqual(0);
      },
      {
        preSetupHook: async ({ vaults, wsRoot }) => {
          await NoteTestUtilsV4.createNote({
            fname: "foo",
            body: [
              "Repellendus possimus voluptates tempora quia.",
              "Eum deleniti sit delectus officia rem.",
              "",
              "```",
              "^block-anchor",
              "```",
              "",
              "Consectetur blanditiis facilis nulla mollitia.",
            ].join("\n"),
            vault: vaults[0],
            wsRoot,
          });
        },
        expect,
      }
    );
  });

  describe("findLinks", async () => {
    testWithEngine(
      "one link",
      async ({ engine }) => {
        const note = engine.notes["foo"];
        const links = LinkUtils.findLinks({ note, engine });
        expect(links).toMatchSnapshot();
        expect(links[0].to?.fname).toEqual("bar");
      },
      {
        preSetupHook: async ({ wsRoot, vaults }) => {
          await NoteTestUtilsV4.createNote({
            fname: "foo",
            body: "[[bar]]",
            vault: vaults[0],
            wsRoot,
          });
        },
      }
    );

    testWithEngine(
      "empty link",
      async ({ engine }) => {
        const note = engine.notes["foo"];
        const links = LinkUtils.findLinks({ note, engine });
        expect(links).toMatchSnapshot();
        expect(_.isEmpty(links)).toBeTruthy();
      },
      {
        preSetupHook: async ({ wsRoot, vaults }) => {
          await NoteTestUtilsV4.createNote({
            fname: "foo",
            body: "[[]]",
            vault: vaults[0],
            wsRoot,
          });
        },
      }
    );

    testWithEngine(
      "xvault link",
      async ({ engine }) => {
        const note = engine.notes["foo"];
        const links = LinkUtils.findLinks({ note, engine });
        expect(links).toMatchSnapshot();
        expect(links[0].from).toEqual({
          fname: "foo",
          id: "foo",
          vaultName: "vault1",
        });
        expect(links[0].to).toEqual({
          fname: "bar",
          vaultName: "vault2",
        });
      },
      {
        preSetupHook: async ({ wsRoot, vaults }) => {
          await NoteTestUtilsV4.createNote({
            fname: "foo",
            body: "[[dendron://vault2/bar]]",
            vault: vaults[0],
            wsRoot,
          });
        },
      }
    );

    test("note ref", async () => {
      await runEngineTestV5(
        async ({ engine, wsRoot }) => {
          const note = engine.notes["foo.one-id"];
          console.log(wsRoot);
          const links = LinkUtils.findLinks({ note, engine });
          expect(links).toMatchSnapshot();
          checkLink({
            src: {
              from: {
                fname: "foo.one",
                id: "foo.one-id",
                vaultName: "vault1",
              },
              type: "wiki",
            },
            target: links[0],
          });
          checkLink({
            src: {
              from: {
                fname: "foo.one",
                id: "foo.one-id",
                vaultName: "vault1",
              },
              type: "ref",
            },
            target: links[1],
          });
        },
        {
          expect,
          preSetupHook: async (opts) => {
            await ENGINE_HOOKS.setupNoteRefRecursive(opts);
          },
        }
      );
    });

    describe("filter", async () => {
      const preSetupHook = async ({ wsRoot, vaults }: WorkspaceOpts) => {
        await NoteTestUtilsV4.createNote({
          fname: "foo",
          wsRoot,
          vault: vaults[0],
          body: ["[[foo]]"].join("\n"),
        });
      };

      const getLinks = (engine: DEngineClient, filter: LinkFilter) => {
        const note = engine.notes["foo"];
        const links = LinkUtils.findLinks({
          note,
          engine,
          filter,
        });
        expect(links).toMatchSnapshot();
        return links;
      };

      test("loc match", async () => {
        await runEngineTestV5(
          async ({ engine }) => {
            const links = getLinks(engine, {
              loc: { fname: "foo" },
            });
            checkLink({
              src: {
                from: {
                  fname: "foo",
                  id: "foo",
                  vaultName: "vault1",
                },
              },
              target: links[0],
            });
          },
          {
            expect,
            preSetupHook,
          }
        );
      });

      test("loc no match", async () => {
        await runEngineTestV5(
          async ({ engine }) => {
            const links = getLinks(engine, {
              loc: { fname: "bar" },
            });
            expect(_.isEmpty(links)).toBeTruthy();
          },
          {
            expect,
            preSetupHook,
          }
        );
      });
    });
  });

  describe("updateLink", async () => {
    test("basic", async () => {
      await runEngineTestV5(
        async ({ engine }) => {
          const note = engine.notes["foo.one-id"];
          const links = LinkUtils.findLinks({ note, engine });
          const link = LinkUtils.dlink2DNoteLink(links[0]);
          const newBody = LinkUtils.updateLink({
            note,
            oldLink: link,
            newLink: {
              ...link,
              from: {
                fname: "foo.bar",
              },
            },
          });
          expect(newBody).toMatchSnapshot();
          await checkString(newBody, "Regular wikilink: [[foo.bar]]");
        },
        {
          preSetupHook: async (opts) => {
            await ENGINE_HOOKS.setupNoteRefRecursive(opts);
          },
          expect,
        }
      );
    });

    describe("multiple links present", async () => {
      const preSetupHook = async ({ wsRoot, vaults }: WorkspaceOpts) => {
        const vault = vaults[0];
        await NoteTestUtilsV4.createNote({
          fname: "foo",
          wsRoot,
          vault,
          body: ["[[foo]]", "nospace[[foo]]", "onespace [[foo]]"].join("\n"),
        });
      };

      test("only link", async () => {
        await runEngineTestV5(
          async ({ engine }) => {
            const note = engine.notes["foo"];
            const links = LinkUtils.findLinks({ note, engine });
            const link = LinkUtils.dlink2DNoteLink(links[0]);
            const newLink = {
              ...link,
              from: {
                fname: "bar",
              },
            };
            const newBody = LinkUtils.updateLink({
              note,
              oldLink: link,
              newLink,
            });
            expect(newBody).toMatchSnapshot();
            await checkString(newBody.split("\n")[0], "[[bar]]");
          },
          {
            preSetupHook,
            expect,
          }
        );
      });

      test("link no space", async () => {
        await runEngineTestV5(
          async ({ engine }) => {
            const idx = 1;
            const newLine = "nospace[[bar]]";
            const note = engine.notes["foo"];
            const links = LinkUtils.findLinks({ note, engine });
            const link = LinkUtils.dlink2DNoteLink(links[idx]);
            const newLink = {
              ...link,
              from: {
                fname: "bar",
              },
            };
            const newBody = LinkUtils.updateLink({
              note,
              oldLink: link,
              newLink,
            });
            expect(newBody).toMatchSnapshot();
            await checkString(newBody.split("\n")[idx], newLine);
          },
          {
            preSetupHook,
            expect,
          }
        );
      });

      test("link onespace", async () => {
        await runEngineTestV5(
          async ({ engine }) => {
            const idx = 2;
            const newLine = "onespace [[bar]]";
            const note = engine.notes["foo"];
            const links = LinkUtils.findLinks({ note, engine });
            const link = LinkUtils.dlink2DNoteLink(links[idx]);
            const newLink = {
              ...link,
              from: {
                fname: "bar",
              },
            };
            const newBody = LinkUtils.updateLink({
              note,
              oldLink: link,
              newLink,
            });
            expect(newBody).toMatchSnapshot();
            await checkString(newBody.split("\n")[idx], newLine);
          },
          {
            preSetupHook,
            expect,
          }
        );
      });
    });
  });

  describe("extractBlocks", () => {
    test("paragraphs", async () => {
      let note: NoteProps | undefined;
      await runEngineTestV5(
        async ({ wsRoot, engine }) => {
          expect(note).toBeTruthy();
          const blocks = await RemarkUtils.extractBlocks({
            note: note!,
            wsRoot,
            engine,
          });
          expect(blocks.length).toEqual(3);
        },
        {
          expect,
          preSetupHook: async ({ wsRoot, vaults }) => {
            note = await NoteTestUtilsV4.createNote({
              wsRoot,
              vault: vaults[0],
              fname: "foo",
              body: [
                "Et et quam culpa.",
                "",
                "Cumque molestiae qui deleniti.",
                "Eius odit commodi harum.",
                "",
                "Sequi ut non delectus tempore.",
              ].join("\n"),
            });
          },
        }
      );
    });

    test("list", async () => {
      let note: NoteProps | undefined;
      await runEngineTestV5(
        async ({ wsRoot, engine }) => {
          expect(note).toBeTruthy();
          const blocks = await RemarkUtils.extractBlocks({
            note: note!,
            wsRoot,
            engine,
          });
          expect(blocks.length).toEqual(5);
        },
        {
          expect,
          preSetupHook: async ({ wsRoot, vaults }) => {
            note = await NoteTestUtilsV4.createNote({
              wsRoot,
              vault: vaults[0],
              fname: "foo",
              body: [
                "Et et quam culpa.",
                "",
                "* Cumque molestiae qui deleniti.",
                "* Eius odit commodi harum.",
                "",
                "Sequi ut non delectus tempore.",
              ].join("\n"),
            });
          },
        }
      );
    });

    test("nested list", async () => {
      let note: NoteProps | undefined;
      await runEngineTestV5(
        async ({ wsRoot, engine }) => {
          expect(note).toBeTruthy();
          const blocks = await RemarkUtils.extractBlocks({
            note: note!,
            wsRoot,
            engine,
          });
          expect(blocks.length).toEqual(8);
        },
        {
          expect,
          preSetupHook: async ({ wsRoot, vaults }) => {
            note = await NoteTestUtilsV4.createNote({
              wsRoot,
              vault: vaults[0],
              fname: "foo",
              body: [
                "Et et quam culpa.",
                "",
                "* Cumque molestiae qui deleniti.",
                "* Eius odit commodi harum.",
                "  * Sequi ut non delectus tempore.",
                "  * In delectus quam sunt unde.",
                "* Quasi ex debitis aut sed.",
                "",
                "Perferendis officiis ut non.",
              ].join("\n"),
            });
          },
        }
      );
    });

    test("table", async () => {
      let note: NoteProps | undefined;
      await runEngineTestV5(
        async ({ wsRoot, engine }) => {
          expect(note).toBeTruthy();
          const blocks = await RemarkUtils.extractBlocks({
            note: note!,
            wsRoot,
            engine,
          });
          expect(blocks.length).toEqual(3);
        },
        {
          expect,
          preSetupHook: async ({ wsRoot, vaults }) => {
            //const txt = `# Hello Heading\nHello Content`;
            note = await NoteTestUtilsV4.createNote({
              wsRoot,
              vault: vaults[0],
              fname: "foo",
              body: [
                "Et et quam culpa.",
                "",
                "| Sapiente | accusamus |",
                "|----------|-----------|",
                "| Laborum  | libero    |",
                "| Ullam    | optio     |",
                "",
                "Sequi ut non delectus tempore.",
              ].join("\n"),
            });
          },
        }
      );
    });

    test("existing anchors", async () => {
      let note: NoteProps | undefined;
      await runEngineTestV5(
        async ({ wsRoot, engine }) => {
          expect(note).toBeTruthy();
          const blocks = await RemarkUtils.extractBlocks({
            note: note!,
            wsRoot,
            engine,
          });
          expect(blocks.length).toEqual(7);
          expect(blocks[0].anchor?.value).toEqual("et-et-quam-culpa");
          expect(blocks[1].anchor?.value).toEqual("paragraph");
          expect(blocks[2].anchor?.value).toEqual("item1");
          expect(blocks[3].anchor?.value).toEqual("item2");
          expect(blocks[4].anchor?.value).toEqual("item3");
          expect(blocks[5].anchor?.value).toEqual("list");
          expect(blocks[6].anchor?.value).toEqual("table");
        },
        {
          expect,
          preSetupHook: async ({ wsRoot, vaults }) => {
            //const txt = `# Hello Heading\nHello Content`;
            note = await NoteTestUtilsV4.createNote({
              wsRoot,
              vault: vaults[0],
              fname: "foo",
              body: [
                "# Et et quam culpa. ^header",
                "",
                "Ullam vel eius reiciendis. ^paragraph",
                "",
                "* Cumque molestiae qui deleniti. ^item1",
                "* Eius odit commodi harum. ^item2",
                "  * Sequi ut non delectus tempore. ^item3",
                "",
                "^list",
                "",
                "| Sapiente | accusamus |",
                "|----------|-----------|",
                "| Laborum  | libero    |",
                "| Ullam    | optio     | ^table",
              ].join("\n"),
            });
          },
        }
      );
    });

    test("header", async () => {
      let note: NoteProps | undefined;
      await runEngineTestV5(
        async ({ wsRoot, engine }) => {
          expect(note).toBeTruthy();
          const blocks = await RemarkUtils.extractBlocks({
            note: note!,
            wsRoot,
            engine,
          });
          expect(blocks.length).toEqual(4);
          expect(blocks[0].anchor?.value).toEqual("et-et-quam-culpa");
          expect(blocks[2].anchor?.value).toEqual("eius-odit-commodi-harum");
        },
        {
          expect,
          preSetupHook: async ({ wsRoot, vaults }) => {
            //const txt = `# Hello Heading\nHello Content`;
            note = await NoteTestUtilsV4.createNote({
              wsRoot,
              vault: vaults[0],
              fname: "foo",
              body: [
                "# Et et quam culpa. ^anchor",
                "",
                "Cumque molestiae qui deleniti.",
                "",
                "# Eius odit commodi harum.",
                "",
                "Sequi ut non delectus tempore.",
              ].join("\n"),
            });
          },
        }
      );
    });
  });
});

describe("h1ToTitle", () => {
  test("basic", async () => {
    await runEngineTestV5(
      async ({ engine, vaults }) => {
        const proc = MDUtilsV4.procFull({
          dest: DendronASTDest.MD_REGULAR,
          engine,
          fname: "foo",
          vault: vaults[0],
        });
        await Promise.all(
          _.values(engine.notes).map(async (note) => {
            const newBody = await proc()
              .use(RemarkUtils.h1ToTitle(note, []))
              .process(note.body);
            note.body = newBody.toString();
            return note;
          })
        );
      },
      {
        expect,
        preSetupHook: async ({ wsRoot, vaults }) => {
          //const txt = `# Hello Heading\nHello Content`;
          await NoteTestUtilsV4.createNote({
            wsRoot,
            vault: vaults[0],
            fname: "foo",
            body: [`# Foo Header`, `## Foo Content`].join("\n"),
          });
          await NoteTestUtilsV4.createNote({
            wsRoot,
            vault: vaults[0],
            fname: "bar",
            body: [`# Bar Header`, `## Bar Content`].join("\n"),
          });
        },
      }
    );
  });
});

describe("convert old note ref", () => {
  const setup = async (opts: { engine: DEngineClient; vaults: DVault[] }) => {
    const { engine, vaults } = opts;
    const config = { ...engine.config, noLegacyNoteRef: false };
    const proc = MDUtilsV4.procFull({
      dest: DendronASTDest.MD_DENDRON,
      engine,
      config,
      fname: "foo",
      vault: vaults[0],
    });
    const note = engine.notes["foo"];
    const newBody = await proc()
      .use(RemarkUtils.oldNoteRef2NewNoteRef(note, []))
      .process(note.body);
    note.body = newBody.toString();
    return note;
  };

  testWithEngine(
    "basic",
    async ({ engine, vaults }) => {
      const note = await setup({ engine, vaults });
      await checkString(note.body, "![[bar]]");
    },
    {
      preSetupHook: async ({ wsRoot, vaults }) => {
        //const txt = `# Hello Heading\nHello Content`;
        await NoteTestUtilsV4.createNote({
          wsRoot,
          vault: vaults[0],
          fname: "foo",
          body: ["((ref: [[bar]]))"].join("\n"),
        });
      },
    }
  );

  testWithEngine(
    "nested",
    async ({ engine, vaults }) => {
      const note = await setup({ engine, vaults });
      await checkString(note.body, "![[bar]]");
    },
    {
      preSetupHook: async ({ wsRoot, vaults }) => {
        await NoteTestUtilsV4.createNote({
          wsRoot,
          vault: vaults[0],
          fname: "foo",
          body: ["# Header1", "Blah blah", "((ref: [[bar]]))"].join("\n"),
        });
      },
    }
  );

  testWithEngine(
    "multiple",
    async ({ engine, vaults }) => {
      const note = await setup({ engine, vaults });
      await checkString(note.body, "![[bar]]");
      await checkString(note.body, "![[gamma]]");
    },
    {
      preSetupHook: async ({ wsRoot, vaults }) => {
        await NoteTestUtilsV4.createNote({
          wsRoot,
          vault: vaults[0],
          fname: "foo",
          body: [
            "# Header1",
            "Blah blah",
            "((ref: [[bar]]))",
            "((ref: [[gamma]]))",
          ].join("\n"),
        });
      },
    }
  );

  testWithEngine(
    "with header",
    async ({ engine, vaults }) => {
      const note = await setup({ engine, vaults });
      await checkString(note.body, "![[bar#foo]]");
    },
    {
      preSetupHook: async ({ wsRoot, vaults }) => {
        await NoteTestUtilsV4.createNote({
          wsRoot,
          vault: vaults[0],
          fname: "foo",
          body: ["((ref: [[bar]]#foo))"].join("\n"),
        });
      },
    }
  );

  testWithEngine(
    "with header and offset",
    async ({ engine, vaults }) => {
      const note = await setup({ engine, vaults });
      await checkString(note.body, "![[bar#foo,1]]");
    },
    {
      preSetupHook: async ({ wsRoot, vaults }) => {
        await NoteTestUtilsV4.createNote({
          wsRoot,
          vault: vaults[0],
          fname: "foo",
          body: ["((ref: [[bar]]#foo,1))"].join("\n"),
        });
      },
    }
  );

  testWithEngine(
    "with header and offset and range",
    async ({ engine, vaults }) => {
      const note = await setup({ engine, vaults });
      await checkString(note.body, "![[bar#foo,1:#gamma]]");
    },
    {
      preSetupHook: async ({ wsRoot, vaults }) => {
        await NoteTestUtilsV4.createNote({
          wsRoot,
          vault: vaults[0],
          fname: "foo",
          body: ["((ref: [[bar]]#foo,1:#gamma))"].join("\n"),
        });
      },
    }
  );

  testWithEngine(
    "with header with space",
    async ({ engine, vaults }) => {
      const note = await setup({ engine, vaults });
      await checkString(note.body, "![[bar#foo-bar]]");
    },
    {
      preSetupHook: async ({ wsRoot, vaults }) => {
        await NoteTestUtilsV4.createNote({
          wsRoot,
          vault: vaults[0],
          fname: "foo",
          body: ["((ref: [[bar]]#foo bar))"].join("\n"),
        });
      },
    }
  );
});
