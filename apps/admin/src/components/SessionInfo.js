"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionInfo = SessionInfo;
const lucide_react_1 = require("lucide-react");
function SessionInfo({ session }) {
    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    const calculateDuration = () => {
        const start = new Date(session.startTime).getTime();
        const end = session.endTime ? new Date(session.endTime).getTime() : Date.now();
        const duration = end - start;
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };
    const isActive = !session.endTime;
    return (<div className={`glass-card p-4 flex items-center justify-between ${isActive ? 'border-green-500 border-2' : ''}`}>
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${session.mode === 'client' ? 'bg-indigo-100' : 'bg-green-100'}`}>
          {isActive ? (<lucide_react_1.Play className={`w-5 h-5 ${session.mode === 'client' ? 'text-indigo-600' : 'text-green-600'}`}/>) : (<lucide_react_1.Square className={`w-5 h-5 ${session.mode === 'client' ? 'text-indigo-600' : 'text-green-600'}`}/>)}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900">
              {session.activityName || 'No activity'}
            </h4>
            {isActive && (<span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Active
              </span>)}
          </div>
          {session.userName && (<p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <lucide_react_1.User className="w-3 h-3"/>
              {session.userName}
            </p>)}
          {session.task && (<p className="text-sm text-gray-600 mt-1">Task: {session.task}</p>)}
        </div>
      </div>

      <div className="text-right">
        <div className="flex items-center gap-2 text-gray-600">
          <lucide_react_1.Clock className="w-4 h-4"/>
          <span className="font-medium">{calculateDuration()}</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : 'Now'}
        </p>
      </div>
    </div>);
}
//# sourceMappingURL=SessionInfo.js.map