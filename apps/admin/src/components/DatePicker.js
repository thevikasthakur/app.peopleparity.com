"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatePicker = DatePicker;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
function DatePicker({ selectedDate, onDateChange }) {
    const handleDateChange = (e) => {
        const newDate = new Date(e.target.value + 'T00:00:00Z');
        onDateChange(newDate);
    };
    const formatDateForInput = (date) => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    return (<div className="relative">
      <input type="date" value={formatDateForInput(selectedDate)} onChange={handleDateChange} max={formatDateForInput(new Date())} className="px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
      <lucide_react_1.Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
    </div>);
}
//# sourceMappingURL=DatePicker.js.map