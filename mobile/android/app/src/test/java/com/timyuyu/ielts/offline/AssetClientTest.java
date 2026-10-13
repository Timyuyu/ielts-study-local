package com.timyuyu.ielts.offline;
import org.junit.Test;
import static org.junit.Assert.*;
public class AssetClientTest {
    @Test public void audioSeekingHonorsRangesAndRejectsInvalidRequests() {
        assertArrayEquals(new long[]{0, 999}, AssetClient.parseRange(null, 1000));
        assertArrayEquals(new long[]{100, 199}, AssetClient.parseRange("bytes=100-199", 1000));
        assertArrayEquals(new long[]{100, 999}, AssetClient.parseRange("bytes=100-", 1000));
        assertArrayEquals(new long[]{900, 999}, AssetClient.parseRange("bytes=-100", 1000));
        assertArrayEquals(new long[]{0, 999}, AssetClient.parseRange("bytes=0-9999", 1000));
        for (String header : new String[]{"bytes=1000-", "bytes=200-100", "bytes=-0", "bytes=-", "bytes=0-1,3-4", "bytes=999999999999999999999999-"}) {
            assertThrows(IllegalArgumentException.class, () -> AssetClient.parseRange(header, 1000));
        }
    }
}
