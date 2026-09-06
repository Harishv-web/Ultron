package com.ultron.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NativeControlsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
