import * as TabsPrimitive from "@radix-ui/react-tabs"
import * as React from "react";

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

/** Track whose active pill slides to the selected trigger. */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const [pill, setPill] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null)

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
    },
    [ref]
  )

  React.useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      const active = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
      if (!active) return setPill(null)
      setPill({ x: active.offsetLeft, y: active.offsetTop, w: active.offsetWidth, h: active.offsetHeight })
    }
    measure()
    const mo = new MutationObserver(measure)
    mo.observe(list, { attributes: true, subtree: true, attributeFilter: ["data-state"], childList: true })
    const ro = new ResizeObserver(measure)
    ro.observe(list)
    return () => {
      mo.disconnect()
      ro.disconnect()
    }
  }, [])

  return (
    <TabsPrimitive.List
      ref={setRefs}
      className={cn(
        "relative inline-flex h-11 max-w-full items-center justify-start overflow-x-auto overflow-y-hidden rounded-full border border-white/[0.07] bg-white/[0.04] p-1 text-muted-foreground shadow-[inset_0_1px_2px_hsl(232_50%_2%/0.5)] backdrop-blur-md scrollbar-hide",
        className
      )}
      {...props}
    >
      {pill && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 rounded-full bg-[linear-gradient(180deg,hsl(0_0%_100%/0.14),hsl(0_0%_100%/0.06))] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.15),0_4px_14px_-6px_hsl(var(--primary)/0.6)] ring-1 ring-inset ring-white/10 transition-[transform,width,height] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translate(${pill.x}px, ${pill.y}px)`, width: pill.w, height: pill.h }}
        />
      )}
      {children}
    </TabsPrimitive.List>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative z-[1] inline-flex h-full shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3.5 py-1 text-sm font-medium ring-offset-background transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-foreground data-[state=active]:text-foreground",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-2 data-[state=active]:duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
