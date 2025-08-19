declare module 'screenshot-desktop' {
  function screenshot(options?: {
    screen?: number;
    format?: 'png' | 'jpg';
    linuxLibrary?: 'scrot' | 'imagemagick';
  }): Promise<Buffer>;
  
  export = screenshot;
}