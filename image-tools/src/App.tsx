import { useEffect } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { ArrowUpRight, House } from "lucide-react";
import ConvertTool from "./tools/ConvertTool";
import CropTool from "./tools/CropTool";
import Home from "./tools/Home";
import ResizeTool from "./tools/ResizeTool";
import { ToolIcon } from "./ToolIcon";
import { HOME_META, SITE_URL, TOOLS, type ToolId, type ToolInfo } from "./tools";

const TOOL_COMPONENTS: Record<ToolId, (props: { tool: ToolInfo }) => JSX.Element> = {
  resize: ResizeTool,
  convert: ConvertTool,
  crop: CropTool,
};

function setMeta(selector: string, attribute: string, value: string) {
  document.querySelector(selector)?.setAttribute(attribute, value);
}

/** Keeps the tab title, description and canonical URL in sync with the current tool. */
function usePageMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const tool = TOOLS.find((item) => pathname === `/${item.path}`);
    const title = tool?.title ?? HOME_META.title;
    const description = tool?.description ?? HOME_META.description;
    const url = tool ? `${SITE_URL}/${tool.path}` : `${SITE_URL}/`;
    document.title = title;
    setMeta('meta[name="description"]', "content", description);
    setMeta('link[rel="canonical"]', "href", url);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", url);
    window.scrollTo({ top: 0 });
  }, [pathname]);
}

/** Stops the browser from opening a file that is dropped outside a drop area. */
function useBlockStrayFileDrops() {
  useEffect(() => {
    const block = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);
}

function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="https://codewithomesh.com">
        <img
          className="brand-mark"
          src={`${import.meta.env.BASE_URL}logo-icon.svg`}
          alt=""
          width={40}
          height={40}
        />
        <span className="brand-name">
          Code with <b>Omesh</b>
          <small>FREE ONLINE TOOLS</small>
        </span>
      </a>
      <div className="header-right">
        <span className="free-pill">
          <i />
          Free tool
        </span>
        <a href="https://codewithomesh.com/tools/" className="header-link">
          More tools <ArrowUpRight size={15} />
        </a>
      </div>
    </header>
  );
}

function ToolNav() {
  return (
    <nav className="tool-nav" aria-label="Image tools">
      <NavLink to="/" end className="tool-tab">
        <House size={16} /> All image tools
      </NavLink>
      {TOOLS.map((tool) => (
        <NavLink key={tool.id} to={`/${tool.path}`} className="tool-tab">
          <ToolIcon id={tool.id} size={16} /> {tool.name}
        </NavLink>
      ))}
    </nav>
  );
}

export default function App() {
  usePageMeta();
  useBlockStrayFileDrops();
  return (
    <div className="app-shell">
      <Header />
      <ToolNav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          {TOOLS.map((tool) => {
            const Tool = TOOL_COMPONENTS[tool.id];
            return <Route key={tool.id} path={`/${tool.path}`} element={<Tool tool={tool} />} />;
          })}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Code with Omesh</span>
        <span>Useful tools. Simple solutions.</span>
        <a href="https://codewithomesh.com">
          codewithomesh.com <ArrowUpRight size={13} />
        </a>
      </footer>
    </div>
  );
}
