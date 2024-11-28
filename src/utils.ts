function isValidEvent(event: any): boolean {
  return (
    typeof event === "object" &&
    event !== null &&
    typeof event.type === "number" &&
    typeof event.timestamp === "number" &&
    typeof event.data === "object"
  );
}

export function areEventsValid(events: any): boolean {
  return Array.isArray(events) && events.every(isValidEvent);
}

export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
