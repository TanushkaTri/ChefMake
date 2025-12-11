import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChefHat, CookingPot, Calendar, Heart, Menu, X, MessageCircle, GraduationCap } from "lucide-react";

const Sidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { icon: <ChefHat className="h-5 w-5" />, label: "Панель", path: "/dashboard" },
    { icon: <CookingPot className="h-5 w-5" />, label: "AI-кастомизация", path: "/recipe-customizer" },
    { icon: <Heart className="h-5 w-5" />, label: "Избранное", path: "/favorites" },
    // { icon: <Trophy className="h-5 w-5" />, label: "Достижения", path: "/gamification" },
    { icon: <Calendar className="h-5 w-5" />, label: "План питания", path: "/meal-planner" },
    { icon: <MessageCircle className="h-5 w-5" />, label: "Чат ChiefMate", path: "/chiefmate" },
    { icon: <GraduationCap className="h-5 w-5" />, label: "Мастер-классы", path: "/master-classes" },
  ];

  return (
    <div className={`bg-sidebar border-r border-sidebar-border text-sidebar-foreground transition-all duration-300 dark:bg-[#242c3c] dark:border-gray-700 dark:text-white ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="p-4">
        <div className="flex items-center space-x-2 mb-8">
          <ChefHat className="h-8 w-8 text-orange-500" />
          {!collapsed && <span className="text-xl font-bold dark:text-white">ChefMake</span>}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="mb-6 w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {!collapsed && <span className="ml-2">Свернуть</span>}
        </Button>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start ${
                    isActive 
                      ? "bg-orange-500 text-white hover:bg-orange-600" 
                      : "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                  }`}
                >
                  {item.icon}
                  {!collapsed && <span className="ml-2">{item.label}</span>}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;